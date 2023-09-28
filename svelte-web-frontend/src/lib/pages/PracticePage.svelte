<script context="module" lang="ts">
export type PracticePageState = "waitWebcam" | "waitStart" | "countdown" | "playing" | "paused" | "feedback";
export const initialState = "waitWebcam";
</script>
<script lang="ts">
import { v4 as generateUUIDv4 } from 'uuid';
// import { replaceJSONForStringifyDisplay } from '$lib/utils/formatting';
import { getAllLeafNodes } from '$lib/data/dances-store';
import { pauseInPracticePage, debugPauseDurationSecs, debugMode, useAIFeedback } from '$lib/model/settings';
import { GetPixelLandmarksFromNormalizedLandmarks, type Pose3DLandmarkFrame } from '$lib/webcam/mediapipe-utils';
import type PracticeActivity from "$lib/model/PracticeActivity";
import { getDanceVideoSrc, load2DPoseInformation, type Dance, type PoseReferenceData, load3DPoseInformation, type DanceTreeNode } from "$lib/data/dances-store";
import { generateFeedbackRuleBased, generateFeedbackWithClaudeLLM} from '$lib/ai/feedback';
import { DrawColorCodedSkeleton } from '$lib/ai/SkeletonFeedbackVisualization'
import VideoWithSkeleton from "$lib/elements/VideoWithSkeleton.svelte";
import VirtualMirror from "$lib/elements/VirtualMirror.svelte";
import metronomeClickSoundSrc from '$lib/media/audio/metronome.mp3';
import { onMount, createEventDispatcher } from "svelte";
import { webcamStream } from '$lib/webcam/streams';
import { MirrorXPose, type Pose2DPixelLandmarks } from '$lib/webcam/mediapipe-utils';
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { TerminalFeedback } from '$lib/model/TerminalFeedback';
import TerminalFeedbackDialog from '$lib/elements/TerminalFeedbackDialog.svelte';
import { getFrontendDanceEvaluator, type FrontendDanceEvaluator, type FrontendPerformanceSummary, type FrontendLiveEvaluationResult, type FrontendEvaluationTrack } from '$lib/ai/FrontendDanceEvaluator';

export let mirrorForEvaluation: boolean = true;
export let dance: Dance;
export let practiceActivity: PracticeActivity | null;
export let pageActive = false;
export let flipVideo: boolean = false;

const dispatch = createEventDispatcher();

let fitVideoToFlexbox = true;

let state: PracticePageState = initialState;
$: console.log("PracticePage state", state);
$: dispatch('stateChanged', state); 

let currentActivityStepIndex: number = 0;
let currentActivityType: PracticeActivity["activityTypes"]["0"] = 'watch';
$: {
    if (practiceActivity) {
        currentActivityType = practiceActivity.activityTypes[currentActivityStepIndex];
    }
}

let containingDanceTreeLeafNodes = [] as DanceTreeNode[];
$: {
    if (practiceActivity?.danceTreeNode) {
        containingDanceTreeLeafNodes = getAllLeafNodes(practiceActivity.danceTreeNode).filter((node) => node.id !== practiceActivity?.danceTreeNode?.id);
    } else {
        containingDanceTreeLeafNodes = [];
    }
}

let beatDuration = 1;
$: {
    beatDuration = dance?.bpm ? 60 / dance.bpm : 1;
}

let clickAudioElement: HTMLAudioElement = new Audio(metronomeClickSoundSrc);;
let virtualMirrorElement: VirtualMirror;
let videoCurrentTime: number = 0;
let videoPlaybackSpeed: number = 1;
let videoDuration: number = 0;
$: console.log("VideoDuration", videoDuration);
let isVideoPausedBinding: boolean = true;
let danceSrc: string = '';
let poseEstimationEnabled: boolean = false;
let poseEstimationReady: Promise<void> | null = null;
let referenceDancePoses2D: PoseReferenceData<Pose2DPixelLandmarks> | null = null;
let referneceDancePoses3D: PoseReferenceData<Pose3DLandmarkFrame> | null = null;

let lastEvaluationResult: FrontendLiveEvaluationResult | null = null;
let evaluator: FrontendDanceEvaluator | null = null;
let trialId = null as string | null;
let performanceSummary: FrontendPerformanceSummary | null = null;
let terminalFeedback: TerminalFeedback | null = null;

let countdown = -1;
let countdownActive = false;

const debugPauseDuration = 10.0; // if pauseInPracticePage is enabled, we'll pause for this many seconds midway through playback
let currentPlaybackEndtime = practiceActivity?.endTime ?? 0;

let webcamRecorder: MediaRecorder | null = null;
let webcamRecordedChunks: Blob[] = [];

let resolveWebcamRecordedObjectUrl: ((url: string) => void) | null = null;  
let rejectWebcamRecordedObjectUrl: ((reason?: any) => void) | null = null;
let webcamRecordedObjectURL: Promise<string> | null = null;

$: {
    danceSrc = getDanceVideoSrc(dance);
}

$: {
    poseEstimationEnabled = pageActive && (countdownActive || !isVideoPausedBinding || state==="paused") && currentActivityType === 'drill';
}
$: {
    videoPlaybackSpeed = practiceActivity?.playbackSpeed ?? 1.0;
}

let unpauseVideoTimeout: number | null  = null;
function unPauseVideo() {
    unpauseVideoTimeout = null;
    currentPlaybackEndtime = practiceActivity?.endTime ?? videoDuration;
    isVideoPausedBinding = false;
    state = "playing";
}

async function getFeedback(performanceSummary: FrontendPerformanceSummary | null, recordedTrack:  FrontendEvaluationTrack | null) {

    const qijiaOverallScore = performanceSummary?.wholePerformance.qijia2DSkeletonSimilarity.overallScore ?? 0;
    const qijiaByVectorScores = performanceSummary?.wholePerformance.qijia2DSkeletonSimilarity.vectorByVectorScore ?? new Map<string, number>();
    const qijiaBestPossibleScore = performanceSummary?.wholePerformance.qijia2DSkeletonSimilarity.maxPossibleScore ?? 0;

    webcamRecorder?.stop();
    let videoURL: undefined | string = undefined;
    if (webcamRecordedObjectURL) {
        videoURL = await webcamRecordedObjectURL;
    }

    let feedback: TerminalFeedback | undefined = undefined;
    if ($useAIFeedback) {
        try {
            feedback = await generateFeedbackWithClaudeLLM(
                practiceActivity?.danceTree,
                practiceActivity?.danceTreeNode?.id ?? 'undefined',
                performanceSummary ?? undefined,
            )
        } catch(e) {
            console.warn("Error generating feedback with AI - falling back to rule-based feedback", e);
        }
    }

    if (!feedback) {
        feedback = generateFeedbackRuleBased(qijiaOverallScore, qijiaByVectorScores);
    }
    
    feedback.debug = {
        ...feedback.debug,
        performanceSummary: performanceSummary ?? undefined,
        recordedTrack: recordedTrack ?? undefined,
        recordedVideoUrl: videoURL,
    }

    return feedback;
}

// Auto-pause the video when the practice activity is over
$: {
    if ((practiceActivity?.endTime && videoCurrentTime >= currentPlaybackEndtime) || 
        (videoDuration > 0 && videoCurrentTime >= videoDuration)) {
        isVideoPausedBinding = true;

        if (currentPlaybackEndtime === practiceActivity?.endTime) {
            terminalFeedback = null;
            performanceSummary = null;
            let recordedTrack = null as null | FrontendEvaluationTrack;
            
            let subsequences = Object.fromEntries(
                containingDanceTreeLeafNodes.map((node) => 
                    [node.id, { startTime: node.start_time, endTime: node.end_time }]
                )
            );

            if (trialId) {
                recordedTrack = evaluator?.recorder.tracks.get(trialId) ?? null;
                performanceSummary = evaluator?.generatePerformanceSummary(trialId, subsequences) ?? null;
            }
            state = "feedback";
            getFeedback(performanceSummary, recordedTrack)
                .then(feedback => {
                    terminalFeedback = feedback;
                });
        }
        else {
            state = "paused"
            if (unpauseVideoTimeout === null) {
                unpauseVideoTimeout = window.setTimeout(unPauseVideo, 1000 * $debugPauseDurationSecs);
            }
        }
    }
}

async function waitSecs(secs: number | undefined) {
    return new Promise((resolve) => {
        setTimeout(resolve, (secs ?? 1) * 1000);
    })
}

$: {
    if ($webcamStream && state === "waitWebcam") {
        state = "waitStart";
    }
}

function playClickSound() {
    clickAudioElement.currentTime = 0;
    clickAudioElement.play();
}

async function startCountdown() {
    if (countdownActive) return;

    isVideoPausedBinding = true;
    videoCurrentTime = practiceActivity?.startTime ?? 0;
    trialId = generateUUIDv4();

    if (poseEstimationEnabled) {
        console.log("Triggering pose estimation priming");
        await virtualMirrorElement.primePoseEstimation();
    }

    state = "countdown";
    countdownActive = true;

    await waitSecs(beatDuration);

    countdown = 5;
    playClickSound();
    await waitSecs(beatDuration);

    countdown = 6;
    playClickSound();
    await waitSecs(beatDuration);

    countdown = 7;
    playClickSound();
    await waitSecs(beatDuration);

    countdown = 8;
    playClickSound();
    await waitSecs(beatDuration);

    trialId = generateUUIDv4();
    state = "playing"
    countdown = -1;

    resolveWebcamRecordedObjectUrl = null;
    rejectWebcamRecordedObjectUrl = null;
    webcamRecordedObjectURL = null;
    webcamRecorder?.stop();
    webcamRecorder = null;
    webcamRecordedChunks = [];

    if ($debugMode) {
        webcamRecordedObjectURL = new Promise((resolve, reject) => {
            resolveWebcamRecordedObjectUrl = resolve;
            rejectWebcamRecordedObjectUrl = reject;
        });
        webcamRecorder = new MediaRecorder($webcamStream!, { mimeType: 'video/webm' });
        webcamRecordedChunks = [];
        webcamRecorder.addEventListener('dataavailable', (e) => {
            webcamRecordedChunks.push(e.data);
        });
        webcamRecorder.addEventListener('stop', () => {
            let recordedVideoURL = URL.createObjectURL(new Blob(webcamRecordedChunks));
            resolveWebcamRecordedObjectUrl?.(recordedVideoURL);
        });
        webcamRecorder.start();
    }

    isVideoPausedBinding = false;
    countdownActive = false;
}

export async function reset() {
    
    if (unpauseVideoTimeout !== null) {
        clearTimeout(unpauseVideoTimeout);
    }
    trialId = null;
    currentActivityStepIndex = 0;
    state = "waitWebcam";
    lastEvaluationResult = null;
    isVideoPausedBinding = true;
    videoCurrentTime = practiceActivity?.startTime ?? 0;
    const playDuration = (practiceActivity?.endTime ?? videoDuration) - (videoCurrentTime)
    currentPlaybackEndtime = $pauseInPracticePage ? videoCurrentTime + playDuration / 2 : practiceActivity?.endTime ?? videoDuration;
    
    // Start doing these 3d tasks in parallel, wait for them
    // all to complete betore continuing.
    const [ref2dPoses, ref3dPoses, ignore_value] = await Promise.all([
        load2DPoseInformation(dance),
        load3DPoseInformation(dance),
        virtualMirrorElement.webcamStartedPromise,
    ]);    

    referenceDancePoses2D = ref2dPoses;
    referneceDancePoses3D = ref3dPoses;

    state = "waitStart";

    evaluator = getFrontendDanceEvaluator(
        ref2dPoses,
        ref3dPoses
    );
    // console.lUserDanceEvaluator await poseEstimationReady;

    startCountdown();
}


let poseEstimationCorrespondances: Map<number, {
    videoTimeSecs: number;
    actualTimeInMs: number;
}> = new Map();
let lastPoseEstimationVideoTime: number = -1;
let lastPoseEstimationSentTimestamp: Date = new Date();
const maximumPoseEstimationFrequencyHz = 10;
const minimumPoseEsstimationIntervalMs = 1000 / maximumPoseEstimationFrequencyHz;

function poseEstimationFrameSent(e: any) {
    // Associate the webcam frame being sent for pose estimation
    // with the current video timestamp, so that we can later
    // compare the user's pose with the dance pose at that time.
    // console.log("poseEstimationFrameSent", e.detail.frameId, videoCurrentTime);
    poseEstimationCorrespondances.set(e.detail.frameId, {
        videoTimeSecs: videoCurrentTime,
        actualTimeInMs: Date.now(),
    });
    lastPoseEstimationVideoTime = videoCurrentTime;
}

/**
 * An override function used by the virtual mirror element to determine
 * whether or not to send the next frame to pose estimation. When pose estimation
 * is enabled (`poseEstimationEnabled`), VirtualMirror will call this function
 * just before sending the next frame to pose estimation. If this function returns
 * false, the frame will not be sent. This is useful for limiting the frequency
 * of pose estimation to save resources during situations when high pose estimation
 * frequency is unnecessary (such as during the countdown when the video is paused).
 */
function shouldSendNextPoseEstimationFrame() {

    // When the video is paused (such as during countdown), limit the fps 
    // of pose estimation to avoid wasting resources.
    if (
        lastPoseEstimationVideoTime === videoCurrentTime && 
        lastPoseEstimationSentTimestamp.getTime() > Date.now() - minimumPoseEsstimationIntervalMs
    ) {
        return false;
    }
    return true;
}

function poseEstimationFrameReceived(e: any) {
    // console.log("poseEstimationFrameReceived", e.detail.frameId, e.detail.result);

    if (!referenceDancePoses2D) {
        console.log("No dance pose information", e);
        return;
    };
    
    const frameId = e.detail.frameId
    if (!poseEstimationCorrespondances.has(frameId)) {
        console.log(`No matching correspondance for ${frameId}`, e, "current correspondances: ", poseEstimationCorrespondances)
        return;
    };
    const {
        videoTimeSecs,
        actualTimeInMs
    } = poseEstimationCorrespondances.get(frameId)!;

    poseEstimationCorrespondances.delete(frameId);

    const srcWidth = e?.detail?.srcWidth;
    const srcHeight = e?.detail?.srcHeight;
    const userNormalizedPose = (e?.detail?.estimated2DPose ?? null) as NormalizedLandmark[] | null;
    const user3DPose = (e?.detail?.estimated3DPose ?? null) as Pose3DLandmarkFrame | null;
    if (!userNormalizedPose || !user3DPose) { return; }

    // Flip normalized pose, since the user will be mirroring the dance
    let evaluation2DPose = GetPixelLandmarksFromNormalizedLandmarks(userNormalizedPose, srcWidth, srcHeight);
    let evaluation3DPose = user3DPose;MirrorXPose
    if (mirrorForEvaluation) {
        const userDanceFlippedNormalizedPose = MirrorXPose(userNormalizedPose);
        const userDanceFlippedPixelPose = GetPixelLandmarksFromNormalizedLandmarks(userDanceFlippedNormalizedPose, srcWidth, srcHeight);
        evaluation2DPose = userDanceFlippedPixelPose;
        evaluation3DPose = MirrorXPose(user3DPose);
    }
    if (!evaluation2DPose) { return; }
    try {
        lastEvaluationResult = evaluator?.evaluateFrame(
            trialId ?? 'null', 
            dance.clipRelativeStem,
            practiceActivity?.segmentDescription ?? 'undefined',
            videoTimeSecs,
            actualTimeInMs,
            evaluation2DPose,
            evaluation3DPose,
            state !== 'playing',
        ) ?? null;
    }
    catch (e) {
        lastEvaluationResult = null;
        console.warn('Error evaluating frame', e);
    }
}

let drawReferenceDanceSkeleton = false;
let toggleSkeletonInvervel: null | number = null;
//  window.setInterval(() => {
//     drawReferenceDanceSkeleton = !drawReferenceDanceSkeleton;
// }, 1000);

onMount(() => {
    // Prepare pose estimation, so that it'll be ready 
    // when we need it, as opposed to creating the model
    // after the video starts playing.
    videoCurrentTime = practiceActivity?.startTime ?? 0;
    poseEstimationReady = virtualMirrorElement.setupPoseEstimation();
    reset();

    return () => {
        if (unpauseVideoTimeout) {
            clearTimeout(unpauseVideoTimeout);
        }
        if (toggleSkeletonInvervel) {
            clearInterval(toggleSkeletonInvervel);
        }
        if (webcamRecorder) {
            webcamRecorder.stop();
            webcamRecorder = null;
        }
    }
})

</script>

<section class="practicePage">
    {#if state !== "feedback"}
    <div>
        <!-- <video 
               bind:currentTime={videoCurrentTime}
               bind:playbackRate={videoPlaybackSpeed}
               bind:paused={isVideoPaused}
               bind:duration={videoDuration}
               class="shrinkingVideo"
               class:flipped={flipVideo}
               >
            <source src={danceSrc} type="video/mp4" />
        </video> -->
        <VideoWithSkeleton
            bind:currentTime={videoCurrentTime}
            bind:playbackRate={videoPlaybackSpeed}
            bind:paused={isVideoPausedBinding}
            bind:duration={videoDuration}
            flipHorizontal={flipVideo}
            fitToFlexbox={fitVideoToFlexbox}
            poseData={referenceDancePoses2D}
            drawSkeleton={drawReferenceDanceSkeleton}
        >
            <source src={danceSrc} type="video/mp4" />
        </VideoWithSkeleton>
        {#if countdown >= 0}
            <div class="countdown">
                <span class="count">
                    {countdown}
                </span>
            </div>
        {/if}
    </div>
    {/if}
    {#if state === "feedback"}
    <div>
        <TerminalFeedbackDialog 
            feedback={terminalFeedback}
            on:repeat-clicked={reset}
            on:continue-clicked={() => dispatch('continue-clicked')}

        />
        <!-- <pre>{JSON.stringify(performanceSummary, replaceJSONForStringifyDisplay, 2)}</pre> -->
    </div>
    {/if}
    <div style:display={state === "feedback" ? 'none' : 'flex'}>
        <VirtualMirror
            bind:this={virtualMirrorElement}
            {poseEstimationEnabled}
            drawSkeleton={false}
            poseEstimationCheckFunction={shouldSendNextPoseEstimationFrame}
            customDrawFn={(ctx, pose) => DrawColorCodedSkeleton(ctx, pose, lastEvaluationResult, mirrorForEvaluation)}
            on:poseEstimationFrameSent={poseEstimationFrameSent}
            on:poseEstimationResult={poseEstimationFrameReceived}
        />
        {#if state === "waitStart"}  
        <div class="loading outlined thick">
            <!-- <div class="spinner large"></div> -->
            <div class="label">Loading...</div>
        </div>
        {/if}
    </div>

</section>

<style lang="scss">

section {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: stretch;
    
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    gap: 1rem;

    & > div {
        position: relative;
        flex-grow: 1;
        flex-shrink: 1;
        flex-basis: 1rem;
        width: 100%;
        height: 100%;
        border-radius: 0.5em;
        display: flex;
        align-items: stretch;
        justify-content: stretch;
        flex-direction: column;
    }
}

.countdown {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.count {
    width: 4rem;
    height: 4rem;
    text-align: center;
    font-size: 4rem;
    font-weight: bold;
    color: white;
    background-color: rgba(0, 0, 0, 0.2);
    //  add background blur
    backdrop-filter: blur(5px);

    padding: 3rem;
    border-radius: 50%;
}

.loading {
    // position the spinner in the center of the screen
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    padding: 2rem;
    background-color: #fff;

    & .label {
        margin-top: 1em;
    }
}

</style>
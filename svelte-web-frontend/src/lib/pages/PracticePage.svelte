<script context="module" lang="ts">
export type PracticePageState = "waitWebcam" | "waitStart" | 'waitStartUserInteraction' | "countdown" | "playing" | "paused" | "feedback";
export const INITIAL_STATE: PracticePageState = "waitWebcam";
</script>
<script lang="ts">
import { v4 as generateUUIDv4 } from 'uuid';
import { evaluation_summarizeSubsections, practiceFallbackPlaybackSpeed, summaryFeedback_skeleton3d_mediumPerformanceThreshold, summaryFeedback_skeleton3d_goodPerformanceThreshold } from '$lib/model/settings';
// import { replaceJSONForStringifyDisplay } from '$lib/utils/formatting';
import { getAllLeafNodes, getAllNodesInSubtree, makeDanceTreeSlug } from '$lib/data/dances-store';
import { pauseInPracticePage, debugPauseDurationSecs, debugMode, useAIFeedback } from '$lib/model/settings';
import { GetPixelLandmarksFromNormalizedLandmarks, type Pose3DLandmarkFrame } from '$lib/webcam/mediapipe-utils';
import type PracticeActivity from "$lib/model/PracticeActivity";
import { getDanceVideoSrc, load2DPoseInformation, type Dance, type PoseReferenceData, load3DPoseInformation, type DanceTreeNode } from "$lib/data/dances-store";
import { generateFeedbackRuleBased, generateFeedbackWithClaudeLLM} from '$lib/ai/feedback';
import { DrawColorCodedSkeleton } from '$lib/ai/SkeletonFeedbackVisualization'
import VideoWithSkeleton from "$lib/elements/VideoWithSkeleton.svelte";
import VirtualMirror from "$lib/elements/VirtualMirror.svelte";
import metronomeClickSoundSrc from '$lib/media/audio/metronome.mp3';
import { onMount, createEventDispatcher, tick } from "svelte";
import { webcamStream } from '$lib/webcam/streams';
import { MirrorXPose, type Pose2DPixelLandmarks } from '$lib/webcam/mediapipe-utils';
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { TerminalFeedback } from '$lib/model/TerminalFeedback';
import TerminalFeedbackDialog from '$lib/elements/TerminalFeedbackScreen.svelte';
import { getFrontendDanceEvaluator, type FrontendDanceEvaluator, type FrontendPerformanceSummary, type FrontendLiveEvaluationResult, type FrontendEvaluationTrack } from '$lib/ai/FrontendDanceEvaluator';
import ProgressEllipses from '$lib/elements/ProgressEllipses.svelte';
import type { NodeHighlight } from '$lib/elements/DanceTreeVisual.svelte';
import DanceTreeVisual from '$lib/elements/DanceTreeVisual.svelte';
import { goto, invalidateAll } from '$app/navigation';
import { GeneratePracticeActivity } from '$lib/ai/TeachingAgent';
import frontendPerformanceHistory from '$lib/ai/frontendPerformanceHistory';
	import Dialog from '$lib/elements/Dialog.svelte';

export let mirrorForEvaluation: boolean = true;

export let dance: Dance;

export let practiceActivity: PracticeActivity | null;
export let pageActive = false;
export let flipVideo: boolean = false;

const dispatch = createEventDispatcher();

let fitVideoToFlexbox = true;

let state: PracticePageState = INITIAL_STATE;
$: console.log("PracticePage state", state);
$: dispatch('stateChanged', state); 

let isPlayingOrCountdown = INITIAL_STATE === "playing" || INITIAL_STATE === "countdown";
$: isPlayingOrCountdown = state === "playing" || state === "countdown";
let isShowingFeedback = state === 'feedback';
$: isShowingFeedback = state === 'feedback';

let currentActivityStepIndex: number = 0;
let currentActivityType: PracticeActivity["activityTypes"]["0"] = 'watch';
$: {
    if (practiceActivity) {
        currentActivityType = practiceActivity.activityTypes[currentActivityStepIndex];
    }
}

let containingDanceTreeLeafNodes = [] as DanceTreeNode[];
$: {
    if (practiceActivity?.danceTreeNode && $evaluation_summarizeSubsections == "leafnodes") {
        containingDanceTreeLeafNodes = getAllLeafNodes(practiceActivity.danceTreeNode).filter((node) => node.id !== practiceActivity?.danceTreeNode?.id);
    } else if (practiceActivity?.danceTreeNode && $evaluation_summarizeSubsections == "allnodes") {
        containingDanceTreeLeafNodes = getAllNodesInSubtree(practiceActivity.danceTreeNode).filter((node) => node.id !== practiceActivity?.danceTreeNode?.id);
    }else {
        containingDanceTreeLeafNodes = [];
    }
}

let beatDuration = 1;
$: {
    const danceBpm = dance?.bpm ?? 60;
    const danceSecsPerBeat = 60 / danceBpm;
    beatDuration = danceSecsPerBeat / videoPlaybackSpeed;
}

let clickAudioElement: HTMLAudioElement = new Audio(metronomeClickSoundSrc);;
let virtualMirrorElement: VirtualMirror;
let videoWithSkeleton: VideoWithSkeleton;
let videoCurrentTime: number = 0;
let videoPlaybackSpeed: number = 1;
let videoDuration: number = 0;
let videoVolume: number = 0.5;
$: console.log("VideoDuration", videoDuration);
let isVideoPausedBinding: boolean = true;
let showStartCountdownDialog = false;
let danceSrc: string = '';
let poseEstimationEnabled: boolean = false;
let poseEstimationReady: Promise<void> | null = null;
let referenceDancePoses2D: PoseReferenceData<Pose2DPixelLandmarks> | null = null;
let referenceDancePoses3D: PoseReferenceData<Pose3DLandmarkFrame> | null = null;

let lastEvaluationResult: FrontendLiveEvaluationResult | null = null;
let evaluator: FrontendDanceEvaluator | null = null;
let trialId = null as string | null;
$: console.log('trialId changed, now is: ', trialId);
let performanceSummary: FrontendPerformanceSummary | null = null;
let terminalFeedback: TerminalFeedback | null = null;
let nodeHighlights = {} as Record<string, NodeHighlight>;
$: {
    const currentNodeId = practiceActivity?.danceTreeNode?.id;
    const terminalFeedbackNavOptions = terminalFeedback?.navigateOptions ?? [];
    const navOptionsSuggestingANode = terminalFeedbackNavOptions.filter(opt => opt.nodeId);
   
    const defaultHighlight: NodeHighlight = {
        color: 'yellow',
        pulse: true,
    };
    nodeHighlights = Object.fromEntries(
        navOptionsSuggestingANode.map(navOpts => {
            if (currentNodeId && navOpts.nodeId === currentNodeId) {
                return [navOpts.nodeId, {
                    ...defaultHighlight,
                    label: navOpts.nodeId + ' 🔁'
                }]
            }
            return [navOpts.nodeId, {
                ...defaultHighlight,
                label: navOpts.nodeId
            }]
        })
    );

    // If we've just performed an segment and aren't suggesting to repeat it,
    // we will highlight the segment we just performed.
    if (isShowingFeedback && currentNodeId && nodeHighlights[currentNodeId] === undefined) {
        nodeHighlights[currentNodeId] = {
            color: 'green',
            pulse: false,
            label: terminalFeedback?.suggestedAction === "repeat" ? "🔁" : "✔️"
        }
    }
}
async function onNodeClicked(clickedNode: DanceTreeNode) {
    if (isPlayingOrCountdown) return;

    if (!practiceActivity?.dance || !practiceActivity.danceTree) return;
    const dance = practiceActivity.dance;
    const danceTree = practiceActivity.danceTree;
    const danceTreeSlug = makeDanceTreeSlug(practiceActivity.danceTree);
    const nodeSlug = clickedNode.id;
    const url = `/teachlesson/${danceTreeSlug}/practicenode/${nodeSlug}`;
    await goto(url);
    
    let newActivity = await GeneratePracticeActivity(dance, danceTree, clickedNode, 'default');
    practiceActivity = newActivity;
    await reset();
}

let countdown = -1;
let countdownActive = false;

const debugPauseDuration = 10.0; // if pauseInPracticePage is enabled, we'll pause for this many seconds midway through playback
let currentPlaybackEndtime = practiceActivity?.endTime ?? 0;

let webcamRecorderMimeType = 'video/webm';
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

let lastNAttempts = frontendPerformanceHistory.lastNAttempts(
    practiceActivity?.dance?.clipRelativeStem ?? 'undefined',
    'skeleton3DAngleSimilarity',
    20,
)

$: {
    lastNAttempts = frontendPerformanceHistory.lastNAttempts(
        practiceActivity?.dance?.clipRelativeStem ?? 'undefined',
        'skeleton3DAngleSimilarity',
        20,
    )
}

let unpauseVideoTimeout: number | null  = null;
function unPauseVideo() {
    unpauseVideoTimeout = null;
    currentPlaybackEndtime = practiceActivity?.endTime ?? videoDuration;
    isVideoPausedBinding = false;
    state = "playing";
}


async function getFeedback(performanceSummary: FrontendPerformanceSummary | null, recordedTrack:  FrontendEvaluationTrack | null) {
    if (gettingFeedback) return;

    gettingFeedback = true;

    const qijiaOverallScore = performanceSummary?.wholePerformance.qijia2DSkeletonSimilarity.overallScore ?? 0;
    const qijiaByVectorScores = performanceSummary?.wholePerformance.qijia2DSkeletonSimilarity.vectorByVectorScore ?? {} as Record<string, number>;
    const qijiaBestPossibleScore = performanceSummary?.wholePerformance.qijia2DSkeletonSimilarity.maxPossibleScore ?? 0;

    webcamRecorder?.stop();
    let videoURL: undefined | string = undefined;
    if (webcamRecordedObjectURL) {
        videoURL = await webcamRecordedObjectURL;
    }

    const attemptHistory = $lastNAttempts.map((a) => {
        return {
            score: a.summary?.overall ?? NaN, 
            date: a.date,
            segmentId: a.segmentId
        }
    });

    let feedback: TerminalFeedback | undefined = undefined;
    if ($useAIFeedback) {
        try {
            const perfHistory = $frontendPerformanceHistory;
            const dancePerfHistory = practiceActivity?.dance?.clipRelativeStem ? perfHistory?.[practiceActivity.dance.clipRelativeStem] ?? null : null;
            feedback = await generateFeedbackWithClaudeLLM(
                practiceActivity?.danceTree,
                practiceActivity?.danceTreeNode?.id ?? 'undefined',
                performanceSummary ?? undefined,
                dancePerfHistory ?? undefined,
                $summaryFeedback_skeleton3d_mediumPerformanceThreshold,
                $summaryFeedback_skeleton3d_goodPerformanceThreshold,
                attemptHistory,
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
        recordedVideoMimeType: webcamRecorderMimeType,
    }

    gettingFeedback = false;

    return feedback;
}

let gettingFeedback = false;
// Auto-pause the video when the practice activity is over
$: {
    if ((practiceActivity?.endTime && videoCurrentTime >= currentPlaybackEndtime) || 
        (videoDuration > 0 && videoCurrentTime >= videoDuration)) {
        isVideoPausedBinding = true;

        if (currentPlaybackEndtime === practiceActivity?.endTime) {
            console.log('Paused video - reached end of practice activity');
            terminalFeedback = null;
            performanceSummary = null;
            let recordedTrack = null as null | FrontendEvaluationTrack;
            
            let subsequences = Object.fromEntries(
                containingDanceTreeLeafNodes.map((node) => 
                    [node.id, { startTime: node.start_time, endTime: node.end_time }]
                )
            );

            if (trialId) {
                recordedTrack = evaluator?.trackRecorder.tracks.get(trialId) ?? null;
                performanceSummary = evaluator?.generatePerformanceSummary(trialId, subsequences) ?? null;
            }
            trialId = null;
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

async function waitSecs(secs: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, secs * 1000);
    })
}

// $: {
//     if ($webcamStream && state === "waitWebcam") {
//         state = "waitStart";
//     }
// }

async function playClickSound(silent: boolean = false) {
    clickAudioElement.currentTime = 0;
    clickAudioElement.volume = silent ? 0 : 1;
    return clickAudioElement.play();
}

async function startCountdown() {
    if (countdownActive) return;

    state = "countdown";
    countdownActive = true;

    // Safari / webkit disallows media elements from auto-playing without user interaction. We
    // want to be able to control the playback of the video element programatically, which safari
    // will only allow once the user has triggered playback through a user interaction. So, we try 
    // starting playback at the beginning of the countdown. If the 
    playClickSound(true);
    videoVolume = 0.01;
    videoPlaybackSpeed = 0.01;
    let testPlaybackSuccessful = true;
    try {
        await playClickSound(true);
        await videoWithSkeleton.play();
    }
    catch(e) {
        testPlaybackSuccessful = false
        console.warn('startCountdown: test playback unsuccessful. Will try again after user interaction.', e);
    }

    isVideoPausedBinding = true;
    videoCurrentTime = practiceActivity?.startTime ?? 0;
    videoVolume = 0.5;
    videoPlaybackSpeed = $practiceFallbackPlaybackSpeed;
    if (practiceActivity?.playbackSpeed !== 'default' && 
        practiceActivity?.playbackSpeed !== undefined &&
        !isNaN(practiceActivity.playbackSpeed)) {
        videoPlaybackSpeed = practiceActivity.playbackSpeed;
    }

    if (!testPlaybackSuccessful) {
        state = 'waitStartUserInteraction';
        showStartCountdownDialog = true;
        countdownActive = false;
        return;
    }

    await tick();

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

        if (MediaRecorder.isTypeSupported('video/webm')) {
            webcamRecorderMimeType = 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            webcamRecorderMimeType = 'video/mp4';
        }
        webcamRecorder = new MediaRecorder($webcamStream!, { mimeType: webcamRecorderMimeType });
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
    console.log('Reseting practice page');
    if (unpauseVideoTimeout !== null) {
        clearTimeout(unpauseVideoTimeout);
    }
    if (!practiceActivity) {
        console.warn('Null practice activity during reset() call');
    }

    if(!virtualMirrorElement) {
        await tick();
    }

    terminalFeedback = null;
    trialId = null;
    currentActivityStepIndex = 0;
    state = "waitWebcam";
    lastEvaluationResult = null;
    isVideoPausedBinding = true;
    videoCurrentTime = practiceActivity?.startTime ?? 0;
    const playDuration = (practiceActivity?.endTime ?? videoDuration) - (videoCurrentTime)
    currentPlaybackEndtime = $pauseInPracticePage ? videoCurrentTime + playDuration / 2 : practiceActivity?.endTime ?? videoDuration;
    gettingFeedback = false;
    
    // Start doing these 3d tasks in parallel, wait for them
    // all to complete betore continuing.
    const promises = [] as Promise<any>[];
    if (virtualMirrorElement) {
        promises.push(virtualMirrorElement.webcamStartedPromise);
    }
    let ref2dPosesPromise: ReturnType<typeof load2DPoseInformation> | null = null;
    let ref3dPosesPromise: ReturnType<typeof load3DPoseInformation> | null = null;
    if (!referenceDancePoses2D) {
        ref2dPosesPromise = load2DPoseInformation(dance);
        promises.push(ref2dPosesPromise);
    }  
    if (!referenceDancePoses3D) {
        ref3dPosesPromise = load3DPoseInformation(dance);
        promises.push(ref3dPosesPromise);
    }
    if (ref2dPosesPromise) { referenceDancePoses2D = await ref2dPosesPromise; }
    if (ref3dPosesPromise) { referenceDancePoses3D = await ref3dPosesPromise; }
    await Promise.all(promises);

    state = "waitStart";

    evaluator = getFrontendDanceEvaluator(
        referenceDancePoses2D!,
        referenceDancePoses3D!
    );

    isVideoPausedBinding = true;
    videoCurrentTime = practiceActivity?.startTime ?? 0;

    await tick();

    if (poseEstimationEnabled) {
        console.log("Triggering pose estimation priming");
        await virtualMirrorElement.primePoseEstimation();
    }
    await waitSecs(beatDuration);

    startCountdown();
}


let poseEstimationCorrespondances: Map<number, {
    videoTimeSecs: number;
    actualTimeInMs: number;
    pageState: typeof state;
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
        pageState: state,
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
        actualTimeInMs,
        pageState
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
            trialId, 
            dance.clipRelativeStem,
            practiceActivity?.segmentDescription ?? 'undefined',
            videoTimeSecs,
            actualTimeInMs,
            evaluation2DPose,
            evaluation3DPose,
            pageState !== 'playing' || trialId === null,
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

<section class="practicePage" 
    class:hasDanceTree={practiceActivity?.danceTree}
    class:hasFeedback={isShowingFeedback}
    >
    {#if practiceActivity?.danceTree}
    <div class="treevis">
        <DanceTreeVisual 
            node={practiceActivity.danceTree.root }
            showProgressNode={isShowingFeedback ? undefined : practiceActivity.danceTreeNode} 
            currentTime={videoCurrentTime}
            danceTree={practiceActivity.danceTree}
            nodeHighlights={nodeHighlights}
            enableClick={isShowingFeedback}
            enableColorCoding={isShowingFeedback}
            on:nodeClicked={(e) => onNodeClicked(e.detail)}
            playingFocusMode={isShowingFeedback ?  
                'show-all':
                'hide-others'
            }/>
    </div>
    {/if}

    
    <div class="demovid" style:display={state === "feedback" ? 'none' : 'flex'}>
        <VideoWithSkeleton
            bind:this={videoWithSkeleton}
            bind:currentTime={videoCurrentTime}
            bind:playbackRate={videoPlaybackSpeed}
            bind:paused={isVideoPausedBinding}
            bind:duration={videoDuration}
            flipHorizontal={flipVideo}
            fitToFlexbox={fitVideoToFlexbox}
            poseData={referenceDancePoses2D}
            drawSkeleton={drawReferenceDanceSkeleton}
            volume={videoVolume}
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
        {#if state === 'waitStartUserInteraction' && !showStartCountdownDialog}
        <div class="startCountdown">
            <button class="button" on:click={() => startCountdown()}>
                Start Countdown
            </button>
        </div>
        {/if}
    </div>
    {#if state === "feedback"}
    <div class="feedback">
        <TerminalFeedbackDialog 
            feedback={terminalFeedback}
            on:repeat-clicked={reset}
            on:continue-clicked={() => dispatch('continue-clicked')}

        />
        <!-- <pre>{JSON.stringify(performanceSummary, replaceJSONForStringifyDisplay, 2)}</pre> -->
    </div>
    {/if}
    <div 
        class="mirror"
        style:display={state === "feedback" ? 'none' : 'flex'}
        >
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
            <div class="label">Loading<ProgressEllipses /></div>
        </div>
        {/if}
    </div>

    <Dialog open={state === 'waitStartUserInteraction' && showStartCountdownDialog}
        on:dialog-closed={() => showStartCountdownDialog = false}>
        <span slot="title">Click to Start</span>
        <p>We couldn't play the video automatically. Please click or tap the button on the button below to start the countdown.</p>
        <button class="button" on:click={() => startCountdown()}>
            Start Countdown
        </button>
    </Dialog>
</section>

<style lang="scss">

div.demovid { grid-area: demovid; }
div.mirror {  grid-area: mirror;  }
div.treevis { grid-area: treevis; }
div.feedback { grid-area: feedback; }

section {
    display: grid;
    grid-template: "demovid mirror" 1fr / 1fr 1fr;

    &.hasDanceTree {
        grid-template-areas:
            "treevis treevis"
            "demovid  mirror";
        grid-template-rows: auto 1fr;
        grid-template-columns: 1fr 1fr;
        // grid-template:
        //     "treevis treevis" auto
        //     "demovid mirror" 1fr / 1fr 1fr;
    }
    &.hasFeedback {
        grid-template: "feedback feedback" 1fr / 1fr 1fr;
    }
    &.hasDanceTree.hasFeedback {
        grid-template:
            "treevis treevis" auto
            "feedback feedback" 1fr / 1fr 1fr;
    }
    
    align-items: center;
    justify-content: stretch;
    
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    gap: 1rem;

    & > div {
        place-self: center;
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

.startCountdown {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
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
<script context="module" lang="ts">
export type PracticePageState = "waitWebcam" | "waitStart" | "countdown" | "playing" | "paused" | "feedback";
export const initialState = "waitWebcam";
</script>
<script lang="ts">
import { v4 as generateUUIDv4 } from 'uuid';
// import { replaceJSONForStringifyDisplay } from '$lib/utils/formatting';
import { pauseInPracticePage, debugPauseDurationSecs } from '$lib/model/settings';
import { GetPixelLandmarksFromNormalizedLandmarks } from '$lib/webcam/mediapipe-utils';
import type PracticeActivity from "$lib/model/PracticeActivity";
import type { Dance, Pose2DReferenceData } from "$lib/dances-store";
import * as evalAI from '$lib/ai/UserDanceEvaluator';
import { generateFeedbackRuleBased, generateFeedbackWithClaudeLLM} from '$lib/ai/feedback';
import { DrawColorCodedSkeleton } from '$lib/ai/SkeletonFeedbackVisualization'
import VideoWithSkeleton from "$lib/elements/VideoWithSkeleton.svelte";
import VirtualMirror from "$lib/elements/VirtualMirror.svelte";
import metronomeClickSoundSrc from '$lib/media/audio/metronome.mp3';
import { getDanceVideoSrc, loadPoseInformation } from "$lib/dances-store";
import { onMount, createEventDispatcher } from "svelte";
import { webcamStream } from '$lib/webcam/streams';
import { MirrorXNormalizedPose, type Pose2DPixelLandmarks } from '$lib/webcam/mediapipe-utils';
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { TerminalFeedback } from '$lib/model/TerminalFeedback';
import TerminalFeedbackDialog from '$lib/elements/TerminalFeedbackDialog.svelte';
import { QIJIA_SKELETON_SIMILARITY_MAX_SCORE } from '$lib/ai/skeleton-similarity';

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
let referenceDancePoses: Pose2DReferenceData | null = null;

let lastEvaluationResult: evalAI.EvaluationV1Result | null = null;
let evaluator: evalAI.UserDanceEvaluatorV1 | null = null;
let trialId = generateUUIDv4();
let performanceSummary: ReturnType<evalAI.UserDanceEvaluatorV1["getPerformanceSummary"]> | null = null;
let terminalFeedback: TerminalFeedback | null = null;

let countdown = -1;
let countdownActive = false;

const debugPauseDuration = 10.0; // if pauseInPracticePage is enabled, we'll pause for this many seconds midway through playback
let currentPlaybackEndtime = practiceActivity?.endTime ?? 0;

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

// Auto-pause the video when the practice activity is over
$: {
    if ((practiceActivity?.endTime && videoCurrentTime >= currentPlaybackEndtime) || 
        (videoDuration > 0 && videoCurrentTime >= videoDuration)) {
        isVideoPausedBinding = true;

        if (currentPlaybackEndtime === practiceActivity?.endTime) {
            performanceSummary = evaluator?.getPerformanceSummary(trialId) ?? null;
            terminalFeedback = null;
            state = "feedback";

            const qijiaOverallScore = performanceSummary?.qijiaOverallScore ?? 0;
            const qijiaByVectorScores = performanceSummary?.qijiaByVectorScores ?? new Map<string, number>();

            generateFeedbackWithClaudeLLM(
                qijiaOverallScore,
                QIJIA_SKELETON_SIMILARITY_MAX_SCORE,
            ).then((feedback) => {
                terminalFeedback = feedback;
            }).catch((e) => {
                console.warn("Error generating feedback", e);
                terminalFeedback = generateFeedbackRuleBased(qijiaOverallScore, qijiaByVectorScores);
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

    state = "playing"
    countdown = -1;
    isVideoPausedBinding = false;
    countdownActive = false;
}

export async function reset() {
    
    if (unpauseVideoTimeout !== null) {
        clearTimeout(unpauseVideoTimeout);
    }
    currentActivityStepIndex = 0;
    state = "waitWebcam";
    lastEvaluationResult = null;
    isVideoPausedBinding = true;
    videoCurrentTime = practiceActivity?.startTime ?? 0;
    const playDuration = (practiceActivity?.endTime ?? videoDuration) - (videoCurrentTime)
    currentPlaybackEndtime = $pauseInPracticePage ? videoCurrentTime + playDuration / 2 : practiceActivity?.endTime ?? videoDuration;
    
    referenceDancePoses = await loadPoseInformation(dance);
    await virtualMirrorElement.webcamStartedPromise;    
    state = "waitStart";

    evaluator = new evalAI.UserDanceEvaluatorV1(referenceDancePoses);
    // console.log("DancePoseInformation", referenceDancePoses);
    await poseEstimationReady;

    startCountdown();
}

let poseEstimationCorrespondances: Map<number, number> = new Map();
let lastPoseEstimationVideoTime: number = -1;
let lastPoseEstimationSentTimestamp: Date = new Date();
const maximumPoseEstimationFrequencyHz = 10;
const minimumPoseEsstimationIntervalMs = 1000 / maximumPoseEstimationFrequencyHz;

function poseEstimationFrameSent(e: any) {
    // Associate the webcam frame being sent for pose estimation
    // with the current video timestamp, so that we can later
    // compare the user's pose with the dance pose at that time.
    // console.log("poseEstimationFrameSent", e.detail.frameId, videoCurrentTime);
    poseEstimationCorrespondances.set(e.detail.frameId, videoCurrentTime);
    lastPoseEstimationVideoTime = videoCurrentTime;
}

function shouldSendNextPoseEstimationFrame() {
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

    if (state !== 'playing' && state !== 'paused') {
        return;
    }

    if (!referenceDancePoses) {
        console.log("No dance pose information", e);
        return;
    };
    
    const frameId = e.detail.frameId
    if (!poseEstimationCorrespondances.has(frameId)) {
        console.log(`No matching correspondance for ${frameId}`, e, "current correspondances: ", poseEstimationCorrespondances)
        return;
    };
    const videoTimestamp = poseEstimationCorrespondances.get(frameId)!;
    poseEstimationCorrespondances.delete(frameId);

    const srcWidth = e?.detail?.srcWidth;
    const srcHeight = e?.detail?.srcHeight;
    const userNormalizedPose = (e?.detail?.estimatedPose ?? null) as NormalizedLandmark[] | null;
    if (!userNormalizedPose) { return; }

    // Flip normalized pose, since the user will be mirroring the dance
    let evaluationPose = GetPixelLandmarksFromNormalizedLandmarks(userNormalizedPose, srcWidth, srcHeight);
    if (mirrorForEvaluation) {
        const userDanceFlippedNormalizedPose = MirrorXNormalizedPose(userNormalizedPose);
        const userDanceFlippedPixelPose = GetPixelLandmarksFromNormalizedLandmarks(userDanceFlippedNormalizedPose, srcWidth, srcHeight);
        evaluationPose = userDanceFlippedPixelPose;
    }
    if (!evaluationPose) { return; }
    try {
        lastEvaluationResult = evaluator?.evaluateFrame(trialId, videoTimestamp, evaluationPose) ?? null;
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
    }
})

</script>

<section class="practicePage">
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
            poseData={referenceDancePoses}
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
<script lang="ts">

import type PracticeActivity from "./model/PracticeActivity";
import type { Dance, DanceTreeNode, Pose2DReferenceData } from "./dances-store";
import * as evalAI from './ai/Evaluation';

import VideoWithSkeleton from "./elements/VideoWithSkeleton.svelte";
import VirtualMirror from "./elements/VirtualMirror.svelte";
import { getDanceVideoSrc, loadPoseInformation } from "./dances-store";
import { onMount } from "svelte";
import { webcamStream } from './webcam/streams';
import type { Pose2DPixelLandmarks } from './webcam/mediapipe-utils';


export let dance: Dance;
export let practiceActivity: PracticeActivity | null;
let fitVideoToFlexbox = true;

let state: "waitWebcam" | "waitStart" | "playing" | "feedback" = "waitWebcam";
$: console.log("PracticePage state", state);

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

export let pageActive = false;

export let flipVideo: boolean = false;

let virtualMirrorElement: VirtualMirror;
let videoCurrentTime: number = 0;
let videoPlaybackSpeed: number = 1;
let videoDuration: number = 0;
$: console.log("VideoDuration", videoDuration);
let isVideoPaused: boolean = true;
let danceSrc: string = '';
let poseEstimationEnabled: boolean = false;
let poseEstimationReady: Promise<void> | null = null;
let referenceDancePoses: Pose2DReferenceData | null = null;

let evaluator: evalAI.UserDanceEvaluator | null = null;
let trialId = crypto.randomUUID();
let performanceSummary: Record<string, any> | null = null;

let countdown = -1;
let countdownActive = false;

$: {
    danceSrc = getDanceVideoSrc(dance);
}

$: {
    poseEstimationEnabled = pageActive && (countdownActive || !isVideoPaused) && currentActivityType === 'drill';
}
$: {
    videoPlaybackSpeed = practiceActivity?.playbackSpeed ?? 1.0;
}

// Auto-pause the video when the practice activity is over
$: {
    if ((practiceActivity?.endTime && videoCurrentTime >= practiceActivity.endTime) || 
        (videoDuration > 0 && videoCurrentTime >= videoDuration)) {
        isVideoPaused = true;
        performanceSummary = evaluator?.getPerformanceSummary(trialId) ?? null;
        state = "feedback";
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

async function startCountdown() {
    if (countdownActive) return;

    if (poseEstimationEnabled) {
        console.log("Triggering pose estimation priming");
        await virtualMirrorElement.primePoseEstimation();
    }

    state = "playing";
    trialId = crypto.randomUUID();

    countdownActive = true;
    isVideoPaused = true;
    videoCurrentTime = practiceActivity?.startTime ?? 0;

    countdown = 5;
    await waitSecs(beatDuration);

    countdown = 6;
    await waitSecs(beatDuration);

    countdown = 7;
    await waitSecs(beatDuration);

    countdown = 8;
    await waitSecs(beatDuration);

    countdown = -1;
    isVideoPaused = false;
    countdownActive = false;
}

export async function reset() {
    
    currentActivityStepIndex = 0;
    state = "waitWebcam";

    isVideoPaused = true;
    videoCurrentTime = practiceActivity?.startTime ?? 0;
    
    referenceDancePoses = await loadPoseInformation(dance);
    await virtualMirrorElement.webcamStartedPromise;    
    state = "waitStart";

    evaluator = new evalAI.UserDanceEvaluator(referenceDancePoses);
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
    console.log("poseEstimationFrameSent", e.detail.frameId, videoCurrentTime);
    poseEstimationCorrespondances.set(e.detail.frameId, videoCurrentTime);
    lastPoseEstimationVideoTime = videoCurrentTime;
}

function shouldSendNextPoseEstimationFrame() {
    if (lastPoseEstimationVideoTime === videoCurrentTime && lastPoseEstimationSentTimestamp.getTime() > Date.now() - minimumPoseEsstimationIntervalMs) {
        return false;
    }
    return true;
}

function poseEstimationFrameReceived(e: any) {
    console.log("poseEstimationFrameReceived", e.detail.frameId, e.detail.result);

    if (state !== 'playing') {
        return;
    }

    if (!referenceDancePoses) {
        console.log("No dance pose information", e);
        return;
    };
    
    if (!poseEstimationCorrespondances.has(e.detail.frameId)) {
        console.log(`No matching correspondance for ${e.detail.frameId}`, e, "current correspondances: ", poseEstimationCorrespondances)
        return;
    };
    const videoTimestamp = poseEstimationCorrespondances.get(e.detail.frameId)!;
    poseEstimationCorrespondances.delete(e.detail.frameId);

    const userDancePose = (e?.detail?.pixelLMs ?? null) as Pose2DPixelLandmarks | null;
    if (!userDancePose) {
        return;
    }
    
    evaluator?.evaluateFrame(trialId, videoTimestamp, userDancePose);
}

onMount(() => {
    // Prepare pose estimation, so that it'll be ready 
    // when we need it, as opposed to creating the model
    // after the video starts playing.
    videoCurrentTime = practiceActivity?.startTime ?? 0;
    poseEstimationReady = virtualMirrorElement.setupPoseEstimation();
    reset();

    return {}
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
            bind:paused={isVideoPaused}
            bind:duration={videoDuration}
            flipHorizontal={flipVideo}
            fitToFlexbox={fitVideoToFlexbox}
            poseData={referenceDancePoses}
            drawSkeleton={true}
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
        <h1>Feedback</h1>
        <button class="button outlined thin" on:click={reset}>Play Again</button>
        <div><strong>DancePoseReference</strong>{referenceDancePoses}</div>
        <pre>{JSON.stringify(performanceSummary, null, 2)}</pre>
    </div>
    {/if}
    <div style:display={state === "feedback" ? 'none' : 'flex'}>
        <VirtualMirror
            bind:this={virtualMirrorElement}
            {poseEstimationEnabled}
            drawSkeleton={!isVideoPaused || countdownActive}
            poseEstimationCheckFunction={shouldSendNextPoseEstimationFrame}
            on:poseEstimationFrameSent={poseEstimationFrameSent}
            on:poseEstimationResult={poseEstimationFrameReceived}
        />
        {#if state === "waitStart"}  
        <div class="loading outlined thick">
            <div class="spinner large"></div>
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

.shrinkingVideo {
    flex-grow: 1;
    flex-shrink: 1;
    max-width: 100%;
    max-height: 100%;
}

.flipped {
    transform: scaleX(-1);
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
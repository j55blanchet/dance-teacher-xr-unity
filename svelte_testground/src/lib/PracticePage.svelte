<script lang="ts">
import { browser } from '$app/environment';
import type PracticeActivity from "./PracticeActivity";
import type { Dance, DanceTreeNode } from "./dances-store";
import { LiveEvaluator } from './ai/LiveEvaluator';


import VirtualMirror from "./VirtualMirror.svelte";
import { getDanceVideoSrc, loadPoseInformation } from "./dances-store";
import { onMount } from "svelte";

export let dance: Dance;
export let practiceActivity: PracticeActivity | null;
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
let videoElement: HTMLVideoElement;
let virtualMirrorElement: VirtualMirror;
let videoCurrentTime: number = 0;
let videoPlaybackSpeed: number = 1;
let isVideoPaused: boolean = true;
let danceSrc: string = '';
let poseEstimationEnabled: boolean = false;
let poseEstimationReady: Promise<void> | null = null;
let dancePoseInformation: any = null;
let liveEvaluator: LiveEvaluator | null = null;

let countdown = -1;

let countdownActive = false;

$: {
    danceSrc = getDanceVideoSrc(dance);
}

$: {
    poseEstimationEnabled = pageActive && (countdownActive || !isVideoPaused) && currentActivityType === 'drill';
}

// Auto-pause the video when the practice activity is over
$: {
    if (practiceActivity?.endTime && videoCurrentTime > practiceActivity.endTime) {
        videoElement.pause();
        // if (practiceActivity.endTime !== videoCurrentTime && videoElement.duration >= practiceActivity.endTime) {
            // videoElement.currentTime = practiceActivity.endTime;
        // }
    }
}

async function waitSecs(secs: number | undefined) {
    return new Promise((resolve) => {
        setTimeout(resolve, (secs ?? 1) * 1000);
    })
}

async function startCountdown() {
    if (countdownActive) return;

    countdownActive = true;
    if (videoElement) {
        videoElement.pause();
        videoElement.currentTime = practiceActivity?.startTime ?? 0;
    }

    countdown = 5;
    await waitSecs(beatDuration);

    countdown = 6;
    await waitSecs(beatDuration);

    countdown = 7;
    await waitSecs(beatDuration);

    countdown = 8;
    await waitSecs(beatDuration);

    countdown = -1;
    if (videoElement) {
        videoElement.play();
    }

    countdownActive = false;
}

export async function reset() {
    if (videoElement) {
        videoElement.pause();
        videoElement.currentTime = practiceActivity?.startTime ?? 0;
    }
    currentActivityStepIndex = 0;
    currentActivityType = 'watch';
    videoCurrentTime = 0;
    videoPlaybackSpeed = 1;

    dancePoseInformation = await loadPoseInformation(dance);
    console.log("DancePoseInformation", dancePoseInformation);
    liveEvaluator = new LiveEvaluator(dancePoseInformation);
    await poseEstimationReady;
    await virtualMirrorElement.webcamStarted;

    setTimeout(startCountdown, 1000);
}

function poseEstimationFrameSent(e: any) {
    console.log('pose estimation frame sent', e.detail);
}
function poseEstimationFrameReceived(e: any) {
    console.log('pose estimation frame received', e.detail);
}

onMount(() => {
    // Prepare pose estimation, so that it'll be ready 
    // when we need it, as opposed to creating the model
    // after the video starts playing.
    videoElement.currentTime = practiceActivity?.startTime ?? 0;
    poseEstimationReady = virtualMirrorElement.setupPoseEstimation();
    return {}
})



</script>

<section>
    <div>
        <video bind:this={videoElement}
               bind:currentTime={videoCurrentTime}
               bind:playbackRate={videoPlaybackSpeed}
               bind:paused={isVideoPaused}
               >
            <source src={danceSrc} type="video/mp4" />
        </video>

        {#if countdown >= 0}
            <div class="countdown">
                <span class="count">
                    {countdown}
                </span>
            </div>
        {/if}
    </div>
    <div>
        <VirtualMirror
            bind:this={virtualMirrorElement}
            {poseEstimationEnabled}
            drawSkeleton={!isVideoPaused || countdownActive}
            on:poseEstimationFrameSent={poseEstimationFrameSent}
            on:poseEstimationResult={poseEstimationFrameReceived}
        />  
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
        max-width: 100%;
        max-height: 100%;
        border-radius: 0.5em;
        display: flex;

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

</style>
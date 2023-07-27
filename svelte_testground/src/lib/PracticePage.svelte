<script lang="ts">
	import { browser } from '$app/environment';
import type PracticeActivity from "./PracticeActivity";
import type { Dance, DanceTreeNode } from "./dances-store";

import VirtualMirror from "./VirtualMirror.svelte";
import { getDanceVideoSrc } from "./dances-store";
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


let videoElement: HTMLVideoElement;
let virtualMirrorElement: VirtualMirror;
let videoCurrentTime: number = 0;
let videoPlaybackSpeed: number = 1;
let isVideoPaused: boolean = true;
let danceSrc: string = '';
let poseEstimationEnabled: boolean = false;
let poseEstimationReady: Promise<void> | null = null;

$: {
    danceSrc = getDanceVideoSrc(dance);
}

$: {
    poseEstimationEnabled = !isVideoPaused && currentActivityType === 'drill';
}

// Auto-pause the video when the practice activity is over
$: {
    if (practiceActivity?.endTime && videoCurrentTime > practiceActivity.endTime) {
        videoElement.pause();
        if (practiceActivity.endTime !== videoCurrentTime && videoElement.duration >= practiceActivity.endTime) {
            videoElement.currentTime = practiceActivity.endTime;
        }
    }
}

function startVideoPlayback() {
    if (videoElement) {
        videoElement.play();
    }
}

export async function reset() {
    currentActivityStepIndex = 0;
    currentActivityType = 'watch';
    videoCurrentTime = 0;
    videoPlaybackSpeed = 1;

    await poseEstimationReady;
    await virtualMirrorElement.webcamStarted;

    setInterval(startVideoPlayback, 1000);
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
    </div>
    <div>
        <VirtualMirror
            bind:this={virtualMirrorElement}
            {poseEstimationEnabled}
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

</style>
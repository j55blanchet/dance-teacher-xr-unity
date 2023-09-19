<script lang="ts">

import type { Dance, PoseReferenceData } from "$lib/data/dances-store";
import { onDestroy, onMount } from "svelte";
import { type Pose2DPixelLandmarks, GetNormalizedLandmarksFromPixelLandmarks } from "$lib/webcam/mediapipe-utils";
import { DrawingUtils, PoseLandmarker, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { getContentSize } from "$lib/utils/resizing";

let videoElement: HTMLVideoElement;
let canvasElement: HTMLCanvasElement;
let canvasCtx: CanvasRenderingContext2D | null = null;
let drawingUtils: DrawingUtils | null = null;
export let fitToFlexbox: boolean = false;

export let currentTime: number = 0;
export let playbackRate: number = 1.0;
export let paused: boolean = true;
export let volume: number = 1.0;
export let muted: boolean = false;
export let videoWidth: number = 0;
export let videoHeight: number = 0;
export let flipHorizontal: boolean = false;

let videoAspectRatio = 1;
$: if (videoWidth > 0 && videoHeight > 0) {
    videoAspectRatio = videoWidth / videoHeight;
}

export let duration = 0;
export let ended: boolean = false;

export let dance: Dance | null = null;
export let poseData: PoseReferenceData<Pose2DPixelLandmarks> | null = null;
export let drawSkeleton: boolean = true;

let videoElementWidth: number = 0;
let videoElementHeight: number = 0;
let videoElementAspectRatio = 1;
$: if (videoElementWidth > 0 && videoElementHeight > 0) {
    videoElementAspectRatio = videoElementWidth / videoElementHeight;
}

$: {
    if (canvasElement && videoElementAspectRatio > videoAspectRatio) {
        canvasElement.width = videoElementWidth;
        canvasElement.height = videoElementHeight * videoAspectRatio;
    }
    else if (canvasElement && videoElementAspectRatio <= videoAspectRatio) {
        canvasElement.width = videoElementWidth;
        canvasElement.height = videoElementWidth / videoAspectRatio;
    }
}

// Keep track of the current pose to draw
let poseToDraw: NormalizedLandmark[] | null = null;
$: {
    const pixelLandmarks = poseData?.getReferencePoseAtTime(currentTime) ?? null;
    // console.log("New reference pose (pix landmarks)", pixelLandmarks, videoWidth, videoHeight)
    poseToDraw = pixelLandmarks ? GetNormalizedLandmarksFromPixelLandmarks(pixelLandmarks, videoWidth, videoHeight) : null;
}

let requestedAnimationFrameId: number | null = null;

$: canvasElement, canvasCtx, poseToDraw, drawSkeleton, drawCanvas();

function drawCanvas() {
    if (!canvasElement) return;
    if (!canvasCtx) {
        canvasCtx = canvasElement.getContext('2d');
    }
    if (!canvasCtx) { return; }
    if (!drawingUtils) {
        drawingUtils = new DrawingUtils(canvasCtx);
    }

    // Clear the canvas from the previous frame
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (!poseToDraw || !drawSkeleton) { return; }

    // console.log("redrawing pose", poseToDraw)
    drawingUtils.drawConnectors(
        poseToDraw, 
        PoseLandmarker.POSE_CONNECTIONS, 
        {
            color: 'white',
            lineWidth: 4,
        }
    );
    drawingUtils.drawConnectors(
        poseToDraw, 
        PoseLandmarker.POSE_CONNECTIONS, 
        {
            color: 'black',
            lineWidth: 2,
        }
    );
    // drawingUtils.drawLandmarks(
    //     poseToDraw, 
    // {
    //     color: 'red',
    //     radius: 1,
    // }
    // );
}


onMount(() => {
    // requestedAnimationFrameId = requestAnimationFrame(drawCanvas);
    const resizeObserver = new ResizeObserver(entries => {
        if (!videoElement) return;
        const [width, height] = getContentSize(videoElement)
        videoElementWidth = width;
        videoElementHeight = height;
    })
    resizeObserver.observe(videoElement);
    return () => {
        // resizeObserver.unobserve(videoElement);
        // if (requestedAnimationFrameId !== null) {
        //     cancelAnimationFrame(requestedAnimationFrameId);
        // }
    }
});

</script>

<div class:fitToFlexbox={fitToFlexbox} class="videoWithSkeleton">
    <video 
        bind:this={videoElement}
        bind:currentTime
        bind:playbackRate
        bind:paused
        bind:volume
        bind:muted
        bind:videoWidth
        bind:videoHeight
        bind:duration
        bind:ended
        class:flipped={flipHorizontal}
    >
        <slot />
    </video>
    <div class="overlay">
        <canvas bind:this={canvasElement}></canvas>
    </div>
    <!-- <div class="overlay debug">
        <div><strong>Pose Data:</strong>&nbsp;{poseData ? "Exists" : "Null"}</div>
        <div><strong>Pose To Draw:</strong>&nbsp;{poseToDraw ? "Exists" : "Null"}</div>
        <div><strong>Skeleton Enabled:</strong>&nbsp;{drawSkeleton}</div>
    </div> -->
</div>

<style lang="scss">

.videoWithSkeleton {
    position: relative;
    display: flex;
    flex-shrink: 1;
    flex-grow: 1;
    max-width: 100%;
}

video {
    max-width: 100%;
    // width: 100%;
    height: 100%;
    border-radius: var(--std-border-radius);
}

.overlay {
    pointer-events: none;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}

.debug {
    bottom: auto;
}
canvas {
    background: transparent;
}

.flipped {
    transform: scaleX(-1);
}

.fitToFlexbox {
    height: 0;
    align-items: center;
    flex-direction: column;
}
.fitToFlexbox video {
    // height: 0;
    flex-grow: 1;
    flex-shrink: 1;
}

</style>
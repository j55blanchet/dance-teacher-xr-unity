<script lang="ts">

import type { Dance, Pose2DReferenceData } from "$lib/dances-store";
import { onDestroy, onMount } from "svelte";
import { type Pose2DPixelLandmarks, GetNormalizedLandmarksFromPixelLandmarks } from "$lib/webcam/mediapipe-utils";
import { DrawingUtils, type NormalizedLandmark } from "@mediapipe/tasks-vision";

let videoElement: HTMLVideoElement;
let canvasElement: HTMLCanvasElement;
let canvasCtx: CanvasRenderingContext2D | null = null;
let drawingUtils: DrawingUtils | null = null;

export let currentTime: number = 0;
export let playbackRate: number = 1.0;
export let paused: boolean = true;
export let volume: number = 1.0;
export let muted: boolean = false;
export let videoWidth: number = 0;
export let videoHeight: number = 0;

export let duration = 0;
export let ended: boolean = false;

export let dance: Dance | null = null;
export let poseData: Pose2DReferenceData | null = null;

// Keep track of the current pose to draw
let poseToDraw: NormalizedLandmark[] | null = null;
$: {
    const pixelLandmarks = poseData?.getReferencePoseAtTime(currentTime) ?? null;
    poseToDraw = pixelLandmarks ? GetNormalizedLandmarksFromPixelLandmarks(pixelLandmarks, dance?.width ?? 1, dance?.height ?? 1) : null;
}

let requestedAnimationFrameId: number | null = null;

function drawCanvas() {
    if (!canvasCtx) {
        canvasCtx = canvasElement.getContext('2d');
    }
    if (!canvasCtx) { return; }
    if (!drawingUtils) {
        drawingUtils = new DrawingUtils(canvasCtx);
    }

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    if (!poseToDraw) { return; }

    drawingUtils.drawConnectors(poseToDraw, undefined, {
    });
    drawingUtils.drawLandmarks(poseToDraw, {
    });
    
    requestedAnimationFrameId = requestAnimationFrame(drawCanvas);
}

onMount(() => {
    requestedAnimationFrameId = requestAnimationFrame(drawCanvas);
});
onDestroy(() => {
    if (requestedAnimationFrameId !== null) {
        cancelAnimationFrame(requestedAnimationFrameId);
    }
})

</script>

<div>
    <video 
        bind:this={videoElement}
        {currentTime}    
        {playbackRate}
        {paused}
        {volume}
        {muted}
        {videoWidth}
        {videoHeight}
        {duration}
        {ended}
    >
        <slot />
    </video>
    <canvas bind:this={canvasElement}></canvas>
</div>

<style lang="scss">

div {
    display: relative;
    flex-shrink: 1;
    flex-grow: 1;
}

video {
    width: 100%;
    height: 100%;
}

canvas {
    pointer-events: none;
    background: transparent;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
}

</style>
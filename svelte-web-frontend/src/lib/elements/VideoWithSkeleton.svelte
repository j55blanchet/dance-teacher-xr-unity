<script lang="ts">
import type { Dance, PoseReferenceData } from "$lib/data/dances-store";
import { onMount } from "svelte";
import { type Pose2DPixelLandmarks, GetNormalizedLandmarksFromPixelLandmarks } from "$lib/webcam/mediapipe-utils";
import type { DrawingUtils, PoseLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { getContentSize } from "$lib/utils/resizing";
import SegmentedProgressBar, { type SegmentedProgressBarProps } from "./SegmentedProgressBar.svelte";
import Icon from '@iconify/svelte';

let videoElement: HTMLVideoElement;
let canvasElement: HTMLCanvasElement;
let canvasCtx: CanvasRenderingContext2D | null = null;
let drawingUtils: DrawingUtils | null = null;
let tasksVisionModule: typeof import("@mediapipe/tasks-vision") | null = null;
export let fitToFlexbox: boolean = false;

export let currentTime: number = 0;
export let playbackRate: number = 1.0;
export let paused: boolean = true;
export let muted: boolean = false;
export let videoWidth: number = 0;
export let videoHeight: number = 0;
export let flipHorizontal: boolean = false;
export let volume: number = 1.0;
export let readyState: number = 0;

let videoAspectRatio = 1;
$: if (videoWidth > 0 && videoHeight > 0) {
    videoAspectRatio = videoWidth / videoHeight;
}

export let duration = 0;
export let ended: boolean = false;

export let dance: Dance | null = null;
export let poseData: PoseReferenceData<Pose2DPixelLandmarks> | null = null;
export let drawSkeleton: boolean = true;

type ControlOptions = {
    showPlayPause: boolean,
    enablePlayPause: boolean,
    showProgressBar: boolean,
    overrideStartTime? : number,
    overrideEndTime? : number,
    progressBarProps: Partial<Omit<SegmentedProgressBarProps, "currentTime">>
}
export let controls: ControlOptions | boolean = false;
let effectiveControls: ControlOptions;
$: {
    if (typeof controls === "boolean") {
        effectiveControls = {
            showPlayPause: controls,
            enablePlayPause: controls,
            showProgressBar: controls,
            progressBarProps: {},
        }
    } else {
        effectiveControls = controls;
    }
}

let progressBarEffectiveProps = {} as SegmentedProgressBarProps;
$: {
    progressBarEffectiveProps = {
        startTime: effectiveControls.overrideStartTime ?? 0,
        endTime: effectiveControls.overrideEndTime ?? duration,
        currentTime: currentTime,
        breakpoints: [],
        labels: [],
        classes: [["is-primary"]],
        segmentClickStart: false,
        ...effectiveControls.progressBarProps,
    }
}

// Wait for metadata to be loaded before seeking to the overridden start time.
//   See: https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
//   0 = HAVE_NOTHING, 1+ has metadata and is seekable
$: if (readyState > 0 && effectiveControls?.overrideStartTime !==  undefined) {
    currentTime = effectiveControls.overrideStartTime;
}

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
    if (!tasksVisionModule) { return; }
    if (!drawingUtils) {
        drawingUtils = new tasksVisionModule.DrawingUtils(canvasCtx);
    }

    // Clear the canvas from the previous frame
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (!poseToDraw || !drawSkeleton) { return; }

    // console.log("redrawing pose", poseToDraw)
    drawingUtils.drawConnectors(
        poseToDraw, 
        tasksVisionModule.PoseLandmarker.POSE_CONNECTIONS, 
        {
            color: 'white',
            lineWidth: 4,
        }
    );
    drawingUtils.drawConnectors(
        poseToDraw, 
        tasksVisionModule.PoseLandmarker.POSE_CONNECTIONS, 
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

    import("@mediapipe/tasks-vision").then(x => {
        tasksVisionModule = x;
    });
    return () => {
        // resizeObserver.unobserve(videoElement);
        // if (requestedAnimationFrameId !== null) {
        //     cancelAnimationFrame(requestedAnimationFrameId);
        // }
    }
});

export async function play() {
    await videoElement.play();
}

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
        bind:readyState
        class:flipped={flipHorizontal}
    >
        <slot />
    </video>
    <div class="is-overlay canvas">
        <canvas bind:this={canvasElement}></canvas>
    </div>
    <div class="is-overlay control-container p-2">
        
        {#if effectiveControls.showProgressBar}
        <SegmentedProgressBar 
            {...progressBarEffectiveProps}
        />
        {/if}
        {#if effectiveControls.showPlayPause}
        <div class="buttons is-centered">
            <button class="button" disabled={!effectiveControls.enablePlayPause} on:click={() => paused = !paused}>
                {#if paused}
                <span class="icon">
                    <Icon icon="icon-park-outline:play-one" />
                </span>
                {:else if !paused}
                <span class="icon">
                    <Icon icon="icon-park-outline:pause" />
                </span>
                {/if}

            </button>
        </div>
        {/if}
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
    max-height: 100%;
    min-width: 0;
    min-height: 0;
    align-items: center;
    justify-content: center;
}

video {
    max-width: 100%;
    // width: 100%;
    max-height: 100%;
    border-radius: var(--std-border-radius);
}

.canvas {
    pointer-events: none;
    // position: absolute;
    // top: 0;
    // left: 0;
    // right: 0;
    // bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
}
.control-container {
    display: flex;
    align-items: stretch;
    justify-content: end;
    flex-direction: column;

    gap: var(--spacing-2);
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
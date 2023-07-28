<script lang="ts">
	// import { PoseEstimationWorker } from '$lib/pose-estimation.worker?worker';
    import PoseEstimationWorker, { worker, PostMessages as PoseEstimationMessages, ResponseMessages as PoseEsimationResponses } from '$lib/pose-estimation.worker';

    import { DrawingUtils, PoseLandmarker } from "@mediapipe/tasks-vision";
	import { onMount, tick, createEventDispatcher } from 'svelte';
    import { webcamStream } from './streams';
    import WebcamSelector from "./WebcamSelector.svelte";

    const dispatch = createEventDispatcher();

    function getContentSize (element: HTMLElement) {
        var styles = getComputedStyle(element)

        return [
            element.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight),
            element.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom)
        ]
    }

    export let poseEstimationEnabled: boolean = false;
    export let drawSkeleton: boolean = false;

    export let poseEstimationCheckFunction: () => boolean = () => true;

    // let poseEstimationWorker: Worker | null = null;
    let poseEstimationWorker: PoseEstimationWorker | null = null;
    let webcamConnected = false;
    let videoElement: HTMLVideoElement | undefined = undefined;
    let canvasElement: HTMLCanvasElement | undefined = undefined;
    let containerElement: HTMLDivElement | undefined = undefined;
    // let webcamVideoStream: MediaStream | undefined = undefined;
    let canvasContext: CanvasRenderingContext2D | undefined = undefined;
    let drawingUtils: DrawingUtils | undefined = undefined;

    let resolveWebcamStartedPromise: (() => void) | undefined;
    export const webcamStarted = new Promise<void>((res) => resolveWebcamStartedPromise = res);
    
    let mirrorStartedTime = new Date().getTime();
    let lastFrameSent = -1;
    let lastFrameDecoded = -1;

    let videoWidth = 1;
    let videoHeight = 1;
    let videoAspectRatio = 1;
    $: videoAspectRatio = videoWidth / videoHeight;

    let containerWidth = 1;
    let containerHeight = 1;
    let containerAspectRatio = 1;
    $: containerAspectRatio = containerWidth / containerHeight;

    function onLoadedVideoData() {
        if (!videoElement) {
            return;
        }
        videoWidth = videoElement.videoWidth;
        videoHeight = videoElement.videoHeight;
    }

    // @type {PoseEstimationResult | undefined}
    let lastDecodedData: undefined | any = undefined;

    const resizeCanvas = () => {
        if (!canvasElement) {
            return;
        }

        if (containerAspectRatio > videoAspectRatio) {
            // The container is wider than the video.
            canvasElement.height = containerHeight;
            canvasElement.width = containerHeight * videoAspectRatio;
        } else {
            // The container is taller than the video.
            canvasElement.width = containerWidth;
            canvasElement.height = containerWidth / videoAspectRatio;
        }
    }

    export function setupPoseEstimation() {
        poseEstimationWorker = worker;

		// poseEstimationWorker = new Worker(
        //     new URL('$lib/pose-estimation.worker.ts', import.meta.url),
        //     // { type: 'module' }
        // );

        poseEstimationWorker.onmessage = (msg: any) => {
            if (msg.data.type === PoseEsimationResponses.poseEstimation) {
                lastFrameDecoded = msg.data.frameId;
                lastDecodedData = msg.data.result;

                dispatch('poseEstimationResult', {
                    frameId: msg.data.frameId,
                    result: msg.data.result
                });
            } else if (msg.data.type === PoseEsimationResponses.error) {
                console.error(msg.data.error);

                if (msg.data.frameId === lastFrameSent) {
                    lastFrameSent = -1;
                    lastDecodedData = undefined;
                }
            }
        };

        return poseEstimationWorker.ready;
    }

    $: {
        if (poseEstimationEnabled && !poseEstimationWorker) {
            setupPoseEstimation();
        }
    }

    onMount(async () => {		
		
        // Start pose estimation, if enabled
        if (poseEstimationEnabled) {
            setupPoseEstimation();
        }

        await tick()
        resizeCanvas();

        const resizeObserver = new ResizeObserver(entries => {
            const [width, height] = getContentSize(containerElement!);
            containerWidth = width;
            containerHeight = height;
        });
        resizeObserver.observe(containerElement!);

		return () => {
            poseEstimationWorker?.terminate();
            resizeObserver.unobserve(containerElement!);
		}
	});

    function connectWebcamStream() {
        if (!videoElement || !$webcamStream) {
            return;
        }
        videoElement.srcObject = $webcamStream;
        webcamConnected = true;
        if(resolveWebcamStartedPromise) {
            resolveWebcamStartedPromise();
            resolveWebcamStartedPromise = undefined;
        }
    }
    $: if ($webcamStream && videoElement) {
        connectWebcamStream();
    }
    $: if (videoWidth && videoHeight && containerWidth && containerHeight) {
        resizeCanvas();
    }


    let renderedFrameId = 0;
    function renderCanvas() {
        if (!canvasElement || !videoElement || !$webcamStream || !canvasContext) {
            return;
        }

        // canvasElement.width = videoElement.videoWidth;
        // canvasElement.height = videoElement.videoHeight;

        renderedFrameId += 1;
        
        const videoAspectRatio = videoElement.videoWidth / videoElement.videoHeight;
        const canvasAspectRatio = canvasElement.width / canvasElement.height;
        let drawWidth = canvasElement.width;
        let drawHeight = canvasElement.height;
        let drawX = 0;
        let drawY = 0;
        
        if (videoAspectRatio > canvasAspectRatio) {
            // Video is "more landscape" than the canvas,
            // so center it vertically
            drawHeight = canvasElement.width / videoAspectRatio;
            drawY = (canvasElement.height - drawHeight) / 2;

        } else {
            // Video is "more portrait" than the canvas,
            // so center it horizontally
            drawWidth = drawHeight * videoAspectRatio;
            drawX = (canvasElement.width - drawWidth) / 2;

        }
        canvasContext.drawImage(videoElement, drawX, drawY, drawWidth, drawHeight);

        const isValidFrame = 
            drawX >= 0 &&
            drawY >= 0 && 
            drawWidth > 0 &&
            drawHeight > 0 &&
            canvasAspectRatio > 0 && 
            videoAspectRatio > 0;

        if (!isValidFrame) {
            requestAnimationFrame(renderCanvas);
            return;
        }

        // Send a new frame to be processed by the pose estimation worker
        // only after the last frame has been processed.
        if (lastFrameDecoded == lastFrameSent && poseEstimationEnabled && poseEstimationCheckFunction()) {
            const timeSinceStart = new Date().getTime() - mirrorStartedTime;
            lastFrameSent = renderedFrameId;
            dispatch('poseEstimationFrameSent', { frameId: renderedFrameId, timestampMs: timeSinceStart });
            poseEstimationWorker?.postMessage({
                type: PoseEstimationMessages.requestPoseEstimation,
                frameId: renderedFrameId,
                timestampMs: timeSinceStart,
                image: canvasContext.getImageData(drawX, drawY, drawWidth, drawHeight)
            });
        }

        // Leave early if we're not drawing the skeleton
        if (!drawSkeleton) {
            requestAnimationFrame(renderCanvas);
            return;
        }

        canvasContext.save();
        // if (videoAspectRatio > canvasAspectRatio) {
        //     canvasContext.scale(1.0, drawHeight / canvasElement.height);
        // } else {
        //     canvasContext.scale(drawWidth / canvasElement.width, 1.0);
        // }

        // canvasContext.scale(drawWidth / videoElement.videoWidth, drawHeight / videoElement.videoHeight);
        // canvasContext.translate(drawX, drawY);
        for(const detectedPoseLandmarks of lastDecodedData?.landmarks ?? []) {
            drawingUtils?.drawConnectors(
                detectedPoseLandmarks,
                PoseLandmarker.POSE_CONNECTIONS
            )
            drawingUtils?.drawLandmarks(
                detectedPoseLandmarks, {
                    radius: (data) => 5 // DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
                }
            );
        }
        canvasContext.restore();

        requestAnimationFrame(renderCanvas);
    }

    $: if (webcamConnected && videoElement && canvasElement) {
        canvasContext = canvasElement.getContext('2d', {
            willReadFrequently: true,
        })!;

        drawingUtils = new DrawingUtils(canvasContext);
        renderCanvas();
    }

    onMount(() => {
        connectWebcamStream();
        return {};
    })
</script>

<div class="wrapper" bind:this={containerElement}>
    {#if $webcamStream}    
        <!-- svelte-ignore a11y-media-has-caption -->
        <video bind:this={videoElement} autoplay 
            on:play={resizeCanvas}
            on:loadeddata={onLoadedVideoData}></video>
        <canvas bind:this={canvasElement}></canvas>  
    {:else}
        <div>
            <WebcamSelector />
            <!-- <p>$webcamStream: {$webcamStream}</p> -->
            <!-- <p>videoElement: {videoElement}</p> -->
        </div>
    {/if}
</div>

<style>

.wrapper {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    /* position: absolute; */
    display: flex;
    justify-content: center;
    align-items: center;
}

video {
    width: 100%;
    height: 100%;
    display: hidden;
}

canvas {
    /* width: 100%; */
    /* height: 100%; */
    position: absolute;
}
</style>


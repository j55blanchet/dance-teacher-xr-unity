<script lang="ts">
	import { PoseLandmarkKeys, type Pose3DLandmarkFrame } from '$lib/webcam/mediapipe-utils';
	// import { PoseEstimationWorker } from '$lib/pose-estimation.worker?worker';
    import PoseEstimationWorker, { worker, PostMessages as PoseEstimationMessages, ResponseMessages as PoseEsimationResponses } from '$lib/webcam/pose-estimation.worker';
    import { DrawingUtils, PoseLandmarker, type NormalizedLandmark, type PoseLandmarkerResult } from "@mediapipe/tasks-vision";
	import { onMount, tick, createEventDispatcher } from 'svelte';
    import { webcamStream } from '../webcam/streams';
    import WebcamSelector from "../webcam/WebcamSelector.svelte";
    import { getContentSize } from '$lib/utils/resizing';

    const INITIALIZING_FRAME_ID = -1000;

    const dispatch = createEventDispatcher();

    export let poseEstimationEnabled: boolean = false;
    export let drawSkeleton: boolean = false;

    export let muted: boolean = true;

    export let poseEstimationCheckFunction: () => boolean = () => true;

    // let poseEstimationWorker: Worker | null = null;
    let poseEstimationWorker: PoseEstimationWorker | null = null;

    export let customDrawFn: null | ((ctx: CanvasRenderingContext2D, userPose: null | NormalizedLandmark[]) => void) = null;

    // Whether the pose estimation has been primed with the first frame.
    // let poseEstimationStartedPriming = false;
    let resolvePoseEstimationPrimed: (() => void) | undefined;
    export let poseEstimationPrimedPromise = new Promise<void>((res) => resolvePoseEstimationPrimed = res);

    let webcamConnected = false;
    let videoElement: HTMLVideoElement | undefined = undefined;
    let canvasElement: HTMLCanvasElement | undefined = undefined;
    let containerElement: HTMLDivElement | undefined = undefined;
    // let webcamVideoStream: MediaStream | undefined = undefined;
    let canvasContext: CanvasRenderingContext2D | undefined = undefined;
    let drawingUtils: DrawingUtils | undefined = undefined;

    let resolveWebcamStartedPromise: (() => void) | undefined;
    export const webcamStartedPromise = new Promise<void>((res) => resolveWebcamStartedPromise = res);
    
    export let mirrorHorizontally: boolean = true;

    let mirrorStartedTime = new Date().getTime();
    let lastFrameSent = -1;
    let lastFrameReceivedTime = new Date().getTime();
    let lastFrameDecoded = -1;
    const poseEstimationInterFrameIdleTime = 50; // wait 50ms before dispatching the next frame.

    let lastEstimated2DPose: null | NormalizedLandmark[] = null;

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

                lastFrameReceivedTime = new Date().getTime();

                if (msg.data.frameId === INITIALIZING_FRAME_ID) {
                    // Resolve the pose estimation primed promise, so that 
                    // anything waiting on it can continue.
                    resolvePoseEstimationPrimed?.();
                    return;
                }

                lastFrameDecoded = msg.data.frameId;
                const landmarkerResult = msg.data.landmarkerResult as PoseLandmarkerResult | null;
                const allDetectedPersonsNormalizedLandmarks = landmarkerResult?.landmarks ?? [];
                const estimated2DPose = allDetectedPersonsNormalizedLandmarks[0] ?? null; // get the pose of the first detected person
                lastEstimated2DPose = estimated2DPose

                const allDetectedPersons3DLandmarks = landmarkerResult?.worldLandmarks ?? [];
                const estimated3DPose = allDetectedPersons3DLandmarks[0] ?? null; // get the pose of the first detected person
                
                const eventDetail = {
                    frameId: msg.data.frameId as number,
                    estimated2DPose: lastEstimated2DPose as NormalizedLandmark[] | null,
                    estimated3DPose: estimated3DPose as Pose3DLandmarkFrame | null,
                    srcWidth: msg.data.srcWidth as number,
                    srcHeight: msg.data.srcHeight as number,
                }

                // console.log("Got pose estimation result", eventDetail);
                dispatch('poseEstimationResult', eventDetail);
            } else if (msg.data.type === PoseEsimationResponses.error 
                      || msg.data.type === PoseEsimationResponses.resetError
            ) {
                console.error("PoseEstim Error Message", msg.data.type, msg.data.error);

                if (msg.data.frameId === lastFrameSent) {
                    lastFrameSent = -1;
                    lastEstimated2DPose = null;
                }
            } else if (msg.data.type == PoseEsimationResponses.resetComplete) {
                console.log("Pose Estimation Reset Complete");
                lastFrameSent = -1;
                lastEstimated2DPose = null;
            }
        };

        // Send reset message
        worker.postMessage({
            type: PoseEstimationMessages.reset,
            frameId: new Date().getTime(),
        });

        return poseEstimationWorker.ready;
    }

    /**
     * Sets flag that will initiate priming the pose estimation
     * pipeline by performing an estimation on a frame. 
     */
    export async function primePoseEstimation() {
        if (!poseEstimationEnabled || !poseEstimationWorker || !canvasContext || !canvasElement) {
            throw new Error("Pose estimation not enabled, or not yet ready.");
        }

        console.log("Priming pose estimation")
        poseEstimationPrimedPromise = new Promise<void>((res) => resolvePoseEstimationPrimed = res);

        // Send a single pose estimation request to the worker to make sure it's ready
        poseEstimationWorker.postMessage({
            type: PoseEstimationMessages.requestPoseEstimation,
            frameId: INITIALIZING_FRAME_ID,
            image: canvasContext!.getImageData(0, 0, canvasElement!.width, canvasElement!.height)
        });

        return poseEstimationPrimedPromise;
    }

    $: {
        if (poseEstimationEnabled && !poseEstimationWorker) {
            setupPoseEstimation();
        }
    }

    onMount(() => {		
		
        // Start pose estimation, if enabled
        if (poseEstimationEnabled) {
            setupPoseEstimation();
        }

        // Schedule a canvas resize
        tick().then(resizeCanvas);

        const resizeObserver = new ResizeObserver(entries => {
            if (!containerElement) return;
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
        canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
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
        const currentTime = new Date().getTime();
        const timeSinceLastFrameReceived = currentTime - lastFrameReceivedTime;
        if (poseEstimationEnabled && 
            lastFrameDecoded == lastFrameSent && 
            timeSinceLastFrameReceived > poseEstimationInterFrameIdleTime && 
            poseEstimationCheckFunction()) 
        {
            const timeSinceStart = currentTime - mirrorStartedTime;
            lastFrameSent = renderedFrameId;
            dispatch('poseEstimationFrameSent', { frameId: renderedFrameId, timestampMs: timeSinceStart });
            poseEstimationWorker?.postMessage({
                type: PoseEstimationMessages.requestPoseEstimation,
                frameId: renderedFrameId,
                timestampMs: timeSinceStart,
                image: canvasContext.getImageData(drawX, drawY, drawWidth, drawHeight)
            });
        }

        // Use the custom draw function. This allows for higher specificity
        customDrawFn?.(canvasContext, lastEstimated2DPose);

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

        if(lastEstimated2DPose && lastEstimated2DPose.length === PoseLandmarkKeys.length) {
            drawingUtils?.drawConnectors(
                lastEstimated2DPose,
                PoseLandmarker.POSE_CONNECTIONS
            )
            drawingUtils?.drawLandmarks(
                lastEstimated2DPose, {
                    radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
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
            on:loadeddata={onLoadedVideoData}
            bind:muted={muted}
            class:flippedHorizontal={mirrorHorizontally}
            ></video>
        <canvas bind:this={canvasElement}
            class:flippedHorizontal={mirrorHorizontally}
            ></canvas>  
        <!-- <span>Pose Estimation: {poseEstimationEnabled}</span> -->
    {:else}
        <div>
            <WebcamSelector />
            <!-- <p>$webcamStream: {$webcamStream}</p> -->
            <!-- <p>videoElement: {videoElement}</p> -->
        </div>
    {/if}
</div>

<style>

.flippedHorizontal {
    transform: scaleX(-1);
}

.wrapper {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    /* position: absolute; */
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
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


<script lang="ts">
	import VirtualMirror from './VirtualMirror.svelte';
	import { onMount, tick } from 'svelte';
    import PoseEstimationWorker from '$lib/pose-estimation.worker?worker'
    let poseEstimationWorker: Worker | undefined = undefined;

    export let webcamStarted = false;
    let videoElement: HTMLVideoElement | undefined = undefined;
    let canvasElement: HTMLCanvasElement | undefined = undefined;
    let webcamVideoStream: MediaStream | undefined = undefined;
    let canvasContext: CanvasRenderingContext2D | undefined = undefined;

    const setCanvasSize = () => {
        if (!canvasElement) {
            return;
        }

        canvasElement.width = window.innerWidth;
        canvasElement.height = window.innerHeight;
    }

    onMount(async () => {		
		window.addEventListener('resize', setCanvasSize);
		poseEstimationWorker = new PoseEstimationWorker();

        await tick()
        setCanvasSize();

		return () => {
			window.removeEventListener('resize', setCanvasSize);
            poseEstimationWorker?.terminate();
		}
	});

    function startWebcam() {
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                webcamStarted = true;
                webcamVideoStream = stream;
            })
            .catch(error => {
                console.error(error);
            });
    }

    $: if (webcamVideoStream && videoElement) {
        videoElement.srcObject = webcamVideoStream;
    }

    let frameId = 0;
    function renderCanvas() {
        if (!canvasElement || !videoElement || !webcamVideoStream || !canvasContext) {
            return;
        }

        // canvasElement.width = videoElement.videoWidth;
        // canvasElement.height = videoElement.videoHeight;

        frameId += 1;
        
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

        if (isValidFrame) {
            poseEstimationWorker?.postMessage({
                type: 'processFrame',
                frameId: frameId,
                frame: canvasContext.getImageData(drawX, drawY, drawWidth, drawHeight)
            });
        }
        
        // draw an ellipse in the center of the canvas
        canvasContext.beginPath();
        canvasContext.ellipse(
            canvasElement.width / 2,
            canvasElement.height / 2,
            100,
            100,
            0,
            0,
            2 * Math.PI
        );
        canvasContext.stroke();

        requestAnimationFrame(renderCanvas);
    }

    $: if (webcamStarted && videoElement && canvasElement) {
        canvasContext = canvasElement.getContext('2d', {
            willReadFrequently: true,
        }) ?? undefined;
        renderCanvas();
    }
</script>

<div class="container">
    {#if webcamStarted}    
        <!-- svelte-ignore a11y-media-has-caption -->
        <video bind:this={videoElement} autoplay on:play={setCanvasSize}></video>
        <canvas bind:this={canvasElement}></canvas>  
    {:else}
        <button id="startWebcam" on:click={startWebcam}>
            Start Webcam
        </button>
    {/if}
</div>

<style>

.container {
    width: 100vw;
    height: 100vh;
    margin: 0;
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
}

video {
    width: 100%;
    height: 100%;
}

canvas {
    /* width: 100%; */
    /* height: 100%; */
    position: absolute;
}
</style>


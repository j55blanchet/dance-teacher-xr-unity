<script lang="ts">

import type { TerminalFeedback } from "$lib/model/TerminalFeedback";

export let referenceVideoUrl: string | undefined;
export let recordingUrl: string | undefined;
export let recordingStartOffset: number = 0;
export let recordingSpeed: number = 1;
export let recordingMimeType: string | undefined;


let recordingVideoTime: number = 0;
let recordingDuration: number = 0;
let referenceVideoTime: number = 0;
let recordingVideoEquivalentTime: number = 0;

$: {
    recordingVideoEquivalentTime = (referenceVideoTime / recordingSpeed) - recordingStartOffset;
}

$: {
    recordingVideoTime = recordingVideoEquivalentTime;
    if (recordingVideoEquivalentTime >= recordingDuration && !referenceVideoPaused) {
        // referenceVideoTime = recordingStartOffset + recordingDuration * recordingSpeed;
        recordingVideoTime = recordingDuration; 
        referenceVideoPaused = true;
        recordingVideoPaused = true;
    }
}

let isAtEndOfRecording = false;
$: {
    isAtEndOfRecording = recordingVideoEquivalentTime >= recordingDuration;
}

let referenceVideoStart = 0;
$: referenceVideoStart = recordingStartOffset;
let referenceVideoEnd = 0;
$: referenceVideoEnd = referenceVideoStart + recordingDuration * recordingSpeed;

let referenceVideoPaused = true;
let recordingVideoPaused = true;

let recordingVideoWidth = 1;
let recordingVideoHeight = 1;
let referenceVideoWidth = 1;
let referenceVideoHeight = 1;
let recordingAspectRatio = 1;
$: {
    recordingAspectRatio = recordingVideoWidth / recordingVideoHeight;
    if (isNaN(recordingAspectRatio)) {
        recordingAspectRatio = 1;
    }
}
let referenceAspectRatio = 1;
$: {
    referenceAspectRatio = referenceVideoWidth / referenceVideoHeight;
    if (isNaN(referenceAspectRatio)) {
        referenceAspectRatio = 1;
    }
}

function togglePlayPauseRecording() {
    if (isAtEndOfRecording) {
        referenceVideoTime = referenceVideoStart;
    } else if (recordingVideoPaused) {
        referenceVideoPaused = false;
        recordingVideoPaused = false;
    } else {
        referenceVideoPaused = true;
        recordingVideoPaused = true;
    }
}
</script>


<section class="reviewPage" style:grid-template-columns={`${referenceAspectRatio}fr ${recordingAspectRatio}fr`}>
    <div class="refVideoWrapper videoWrapper">
        <video 
            src={referenceVideoUrl + "#t=" + recordingStartOffset} 
            class="refVideo" 
            bind:currentTime={referenceVideoTime}
            bind:playbackRate={recordingSpeed}
            bind:paused={referenceVideoPaused}
            bind:videoWidth={referenceVideoWidth}
            bind:videoHeight={referenceVideoHeight}
            ></video>
    </div>
    <div class="recordedVideoWrapper videoWrapper">
        <video 
            src={recordingUrl} 
            class="recordedVideo" 
            bind:currentTime={recordingVideoTime} 
            bind:duration={recordingDuration}
            bind:paused={recordingVideoPaused}
            bind:videoWidth={recordingVideoWidth}
            bind:videoHeight={recordingVideoHeight}></video>
    </div>
    <div class="controls">
        <div class="control-row">
            <input class="seeker" type="range" name="videoTime" min={referenceVideoStart} max={referenceVideoEnd} bind:value={referenceVideoTime} step={1/30}>
        </div>
        <div class="control-row">
            <button class="button" on:click={togglePlayPauseRecording}>
                {#if isAtEndOfRecording}
                    Replay
                {:else if recordingVideoPaused}
                    Play
                {:else}
                    Pause
                {/if}
            </button>
        </div>
        <!-- <div>
            recordingStartOffset: {recordingStartOffset}
        </div>
        <div>
            recordingDuration: {recordingDuration}
        </div> -->
    </div>
</section>

<style lang="scss">

.reviewPage {
    display: grid;
    grid-template-areas: 
        "refVideo recordedVideo"
        "controls controls";
    grid-template-rows: 1fr auto;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    height: 100%;
    width: 100%;
    

    & video {
        min-width: 0;
        min-height: 0;
        max-width: 100%;
        max-height: 100%;
        align-self: center;
    }
}


.videoWrapper {
    min-height: 0;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}
.refVideoWrapper {
    grid-area: refVideo;
    // background: blue;
}
.recordedVideoWrapper {
    grid-area: recordedVideo;
    // background: red;
}
.controls {
    grid-area: controls;
}

.seeker {
    width: 100%
}

.control-row {
    display: flex;
    flex-flow: row wrap;
    align-items: start;
    justify-content: center;
}



</style>
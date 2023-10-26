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


<section class="reviewPage">
    <div class="refVideoWrapper">
        <!-- <video 
            src={referenceVideoUrl + "#t=" + recordingStartOffset} 
            class="refVideo" 
            bind:currentTime={referenceVideoTime}
            bind:playbackRate={recordingSpeed}
            bind:paused={referenceVideoPaused}
            ></video> -->
    </div>
    <div class="recordedVideoWrapper">
        <!-- <video 
            src={recordingUrl} 
            class="recordedVideo" 
            bind:currentTime={recordingVideoTime} 
            bind:duration={recordingDuration}
            bind:paused={recordingVideoPaused}></video> -->
    </div>
    <div class="controls">
        <div class="control">
            <input type="range" name="videoTime" id="" min={0} max={recordingDuration} bind:value={recordingVideoTime}>
        </div>
        <div>
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

.refVideoWrapper {
    grid-area: "refVideo";
    min-height: 0;
    min-width: 0;
    background: blue;
}
.recordedVideoWrapper {
    grid-area: "recordedVideo";
    min-height: 0;
    min-width: 0;
    background: red;
}

</style>
<script lang="ts">

import type { TerminalFeedback } from "$lib/model/TerminalFeedback";
	import { debugMode } from "$lib/model/settings";

export let referenceVideoUrl: string | undefined;
export let recordingUrl: string | undefined;
export let recordingStartOffset: number = 0;
export let recordingSpeed: number = 1;
export let recordingMimeType: string | undefined;

let recordingVideoTime: number = 0;
let recordingDuration: number = 0;
let referenceVideoTime: number = 0;

let referenceCorrespondingDuration = 0;
$: referenceCorrespondingDuration = recordingDuration * recordingSpeed;
let referenceVideoStart = 0;
$: referenceVideoStart = recordingStartOffset;
let referenceVideoEnd = 0;
$: referenceVideoEnd = recordingStartOffset + referenceCorrespondingDuration;

let isNearPlaybackEnd = false;
$: isNearPlaybackEnd = referenceVideoTime > referenceVideoEnd - 0.5;

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
    if (isNearPlaybackEnd) {
        referenceVideoPaused = true;
        recordingVideoPaused = true;
        resetToStart();
    }
    else if (recordingVideoPaused) {
        referenceVideoPaused = false;
        recordingVideoPaused = false;
    } else {
        referenceVideoPaused = true;
        recordingVideoPaused = true;
    }
}

function resetToStart() {
    referenceVideoTime = referenceVideoStart;
    recordingVideoTime = 0;
}

function getCorrespondingRecordingTime(referenceTime: number) {
    const recordingVideoEquivalentTime = (referenceTime - recordingStartOffset) / recordingSpeed;
    return recordingVideoEquivalentTime;
}

function setBothTimes(referenceTime: number) {
    if (isNaN(+referenceTime)) {
        return;
    }

    referenceVideoTime = referenceTime;
    const recordingVideoEquivalentTime = getCorrespondingRecordingTime(referenceTime);
    recordingVideoTime = recordingVideoEquivalentTime;
}

const debugDigits = 2;
</script>


<section class="reviewPage" style:grid-template-columns={`${referenceAspectRatio}fr ${recordingAspectRatio}fr`}>
    <div class="refVideoWrapper videoWrapper">
        <video 
            src={referenceVideoUrl} 
            class="refVideo" 
            bind:currentTime={referenceVideoTime}
            bind:playbackRate={recordingSpeed}
            bind:paused={referenceVideoPaused}
            bind:videoWidth={referenceVideoWidth}
            bind:videoHeight={referenceVideoHeight}
            on:loadeddata={() => {
                referenceVideoTime = referenceVideoStart;
            }}
            ></video>
    </div>
    <div class="recordedVideoWrapper videoWrapper">
        <video 
            src={recordingUrl} 
            class="recordedVideo" 
            style="transform: scaleX(-1);"
            bind:currentTime={recordingVideoTime} 
            bind:duration={recordingDuration}
            bind:paused={recordingVideoPaused}
            bind:videoWidth={recordingVideoWidth}
            bind:videoHeight={recordingVideoHeight}
            on:ended={() => {
                referenceVideoPaused = true;
                recordingVideoPaused = true;
            }}
        ></video>
    </div>
    
    <div class="controls">
        <div class="control-row">
            <input class="seeker" type="range" name="videoTime" min={referenceVideoStart} max={referenceVideoEnd - 4/30} value={referenceVideoTime} step={1/30} on:input={(e) => setBothTimes(+e.currentTarget.value)}>
        </div>
        {#if $debugMode}
        <div>Recording ({recordingSpeed.toFixed(2)}x): {getCorrespondingRecordingTime(referenceVideoStart).toFixed(debugDigits)}s --- {recordingVideoTime.toFixed(debugDigits)}s ---{getCorrespondingRecordingTime(referenceVideoEnd).toFixed(debugDigits)}s &nbsp;Duration: {recordingDuration.toFixed(debugDigits)}s</div>
        <div>Reference: {referenceVideoStart.toFixed(debugDigits)}s --- {referenceVideoTime.toFixed(debugDigits)}s --- {referenceVideoEnd.toFixed(debugDigits)}s &nbsp;Duration: {referenceCorrespondingDuration.toFixed(debugDigits)}s</div>
        {/if}
        
        <div class="control-row">
            <button class="daisy-btn" on:click={resetToStart}>
                &lt;&lt;
            </button>
            <button class="daisy-btn" on:click={togglePlayPauseRecording}>
                {#if isNearPlaybackEnd}
                    Reset
                {:else if recordingVideoPaused}
                    Play
                {:else}
                    Pause
                {/if}
            </button>
        </div>
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
    flex-direction: column;
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
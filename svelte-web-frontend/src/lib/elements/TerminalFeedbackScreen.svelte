<script lang="ts">
// TerminalFeedbackDialog.svelte
//
// A component for offering feedback after a user has completed a
// practice attempt of a dance. 
import { reset } from 'microlight';
import type { TerminalFeedback } from '$lib/model/TerminalFeedback';
import type { BodyPartHighlight } from '$lib/elements/StaticSkeletonVisual.svelte';
import StaticSkeletonVisual from '$lib/elements/StaticSkeletonVisual.svelte';
import { createEventDispatcher, onMount, tick } from 'svelte';
import { debugMode } from '$lib/model/settings';
import { replaceJSONForStringifyDisplay } from '$lib/utils/formatting';
import Dialog from './Dialog.svelte';
import ProgressEllipses from './ProgressEllipses.svelte';
import SpeechInterface from './SpeechInterface.svelte';

import InfoIcon from 'virtual:icons/mdi/information';
import StarIcon from 'virtual:icons/mdi/star';

const dispatch = createEventDispatcher();

export let feedback: TerminalFeedback | null = null;

let suggestingRepeat = false;
$: {
    suggestingRepeat = feedback?.suggestedAction === "repeat";
}

type ButtonData = {
    title: string,
    action: () => Promise<void>,
    debug?: string;
}

const repeatButton: ButtonData = {
    title: "Do Again 🔁",
    action: async () => { dispatch("repeat-clicked"); },
}
const continueButton: ButtonData = {
    title: "Continue ➡️",
    action: async () => { dispatch("continue-clicked"); },
}

let buttons = [] as ButtonData[];
// $: {
//     const navigationButtons = (feedback?.navigateOptions ?? [])
//         .map((option, i) => {
//             return {
//                 title: `${option.label}`,
//                 action: async () => {
//                     await goto(option.url)
//                 },
//                 debug: option.url
//             } as ButtonData
//         })

//     if (feedback?.suggestedAction === 'navigate') {
//         buttons = [navigationButtons[0], repeatButton, continueButton, ...navigationButtons.slice(1)];
//     } else if (feedback?.suggestedAction === 'next') {
//         buttons = [continueButton, repeatButton, ...navigationButtons];
//     } else {
//         buttons = [repeatButton, continueButton, ...navigationButtons];
//     }
// }

let showingPerformanceSummary = false;
let showingLLMOutput = false;
let showingTerminalFeedbackJson = false;

let performanceSummaryWithoutTrack: any | undefined;
$: {
    performanceSummaryWithoutTrack = feedback?.debug?.performanceSummary;
    if (performanceSummaryWithoutTrack) {
        performanceSummaryWithoutTrack = {
            ...performanceSummaryWithoutTrack,
            adjustedTrack: undefined,
        }
    }
}
let skeletonHighlights: BodyPartHighlight[] = [];

$: {
    const incorrectHighlights  = (feedback?.incorrectBodyPartsToHighlight ?? []).map((bodyPart) => {
        return { bodyPart, outlineColor: "#F00" }
    })
    const correctHighlights = (feedback?.correctBodyPartsToHighlight ?? []).map((bodyPart) => {
        return { bodyPart, outlineColor: "#0F0" }
    })
    skeletonHighlights = [...incorrectHighlights, ...correctHighlights];
}

const performSyntaxHighlighting = async () => {
    await tick();
    reset('microlight');
};
$: if ($debugMode || feedback?.debug) {
    performSyntaxHighlighting();
}


onMount(() => {
    reset('microlight');
});

function promptDownload(objUrl: string, filename: string) {
    const link = document.createElement('a');
    link.href = objUrl;
    link.download = filename;
    link.click();
}

function getTrackDataUrl(track: any, description: string) {
    let trackDictionary = track.asDictWithoutTimeSeriesResults();
    trackDictionary = {
        ...trackDictionary,
        trackDescription: description,
    }
    const trackJson = JSON.stringify(trackDictionary, replaceJSONForStringifyDisplay);
    const blob = new Blob([trackJson], {type: "application/json"});
    return URL.createObjectURL(blob);
}

function exportRecordings() {

    const track = feedback?.debug?.recordedTrack;
    if (!track) {
        console.error("No track to export");
        return;
    }

    

    const trackDescription = prompt('Please describe this track');
    if (!trackDescription?.length){
        return;
    }

    const filenameRoot = `${trackDescription}.${track?.danceRelativeStem}`.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const url = getTrackDataUrl(track, trackDescription);
    promptDownload(url, `${filenameRoot}.track.json`)

    const adjustedTrack = (feedback?.debug?.performanceSummary as any)?.adjustedTrack;
    if (adjustedTrack) {
        const url = getTrackDataUrl(adjustedTrack, trackDescription + "-adjusted");
        promptDownload(url, `${filenameRoot}.adjustedtrack.json`);
    }

    const webcamRecording = feedback?.debug?.recordedVideoUrl;
    if (webcamRecording) {
        let extension = 'webm';
        if (feedback?.debug?.recordedVideoMimeType == 'video/mp4' || webcamRecording.endsWith('.mp4')) {
            extension = 'mp4';
        }
        promptDownload(webcamRecording, `${filenameRoot}.userrecording.${extension}`);
    }
}

</script>

<div class="feedbackForm">
    <h2>{#if !feedback?.headline}Thinking<ProgressEllipses />{:else}{feedback?.headline}{/if}</h2>
    
    {#if feedback?.paragraphs}
    <div class="paragraphs">
        <SpeechInterface textToSpeak={[
            ...feedback.paragraphs.map(x => x?.trim()),
            ...(feedback.incorrectBodyPartsToHighlight ?? []).map(x => `Try focusing on your ${x} next time.`)
        ].join("\n\n")}/>
    </div>
    {/if}

    {#each feedback?.achievements ?? [] as achivement}
        <p class="achivement"><StarIcon /> {achivement}</p>
    {/each}
    
    {#if feedback?.score}
        <p><code>Score: {feedback.score.achieved.toFixed(2)} / {feedback.score.maximumPossible.toFixed(2)}</code></p>
    {/if}

    {#if skeletonHighlights.length > 0}
    <div class="skeleton">
        <StaticSkeletonVisual 
            highlights={skeletonHighlights}
        />
    </div>
    {/if}
    <div class="info ta-center outlined thin dashed p-1 mt-1">
        <span class="icon"><InfoIcon /></span>
        <span class="message">Click any part of the dance above to practice that segment.</span>
    </div>
    {#if buttons.length > 0}
    <div class="buttons">
    {#each buttons as button, i}
        <button class="button outlined thick" 
            class:primary={i===0} 
            class:secondary={i>0}
            on:click={button.action}
            title={ $debugMode ? button.debug : ''}
            >
            {button.title}
        </button>
    {/each}
    </div>
    {/if}
    {#if $debugMode}
        <div class="debug buttons">
            {#if performanceSummaryWithoutTrack}
            <button class="button" on:click={() => showingPerformanceSummary = true }>
                View Performance Summary
            </button>
            <Dialog open={showingPerformanceSummary}
              on:dialog-closed={() => showingPerformanceSummary = false}>
                <span slot="title">Performance Summary</span>
                <pre class="microlight">{JSON.stringify(performanceSummaryWithoutTrack, replaceJSONForStringifyDisplay, 2)}</pre>
            </Dialog>
            {/if}
            {#if feedback?.debug?.llmOutput || feedback?.debug?.llmInput}
            <button class="button" on:click={() => showingLLMOutput = true }>View LLM Output</button>
            <Dialog open={showingLLMOutput}
                on:dialog-closed={() => showingLLMOutput = false}>
                <span slot="title">LLM Data</span>
                {#if feedback?.debug?.llmInput}
                    <h3>Input</h3>
                    <pre class="microlight">{JSON.stringify(feedback?.debug?.llmInput, undefined, 2)}</pre>
                {/if}
                {#if feedback?.debug?.llmOutput}
                    <h3>Output</h3>
                    <pre class="microlight">{JSON.stringify(feedback?.debug?.llmOutput, undefined, 2)}</pre>
                {/if}
            </Dialog>
            {/if}
            {#if feedback}
            <button class="button" on:click={() => showingTerminalFeedbackJson = true }>View Terminal Feedback</button>
            <Dialog open={showingTerminalFeedbackJson}
                on:dialog-closed={() => showingTerminalFeedbackJson = false}>
                <span slot="title">TerminalFeedback JSON</span>
                <pre style="microlight">{JSON.stringify(feedback, undefined, 2)}</pre>
            </Dialog>
            {/if}
            {#if feedback?.debug?.recordedTrack}
            <button class="button" on:click={exportRecordings}>
                Export Recorded Track
            </button>
            {/if}
        </div>
    {/if}
</div>


<style lang="scss">
.feedbackForm {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-height: calc(var(--content_height) - 2rem);
    max-width: 100%;
    flex-shrink: 1;
    flex-grow: 1;
    gap: 0.5rem;
    overflow: scroll;
    font-size: 1.5rem;

    & p,h2,.paragraphs {
        max-width: 70ch;
    }
}

@media (max-width: 900px) {
    .feedbackForm {
        font-size: 1.25rem;
    }
}

@media (max-width: 600px) {
    .feedbackForm {
        font-size: 1rem;
    }
}
.skeleton {
    // min-height: 0;
    width: 100%;
    // flex-grow: 1;
    flex-shrink: 1;
    max-height: 400px;
    text-align: center;
    padding: 1rem;
    flex-basis: auto;
    overflow: hidden;
}
h2, p {
    margin : 0;
}

.info {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.25rem;
    font-size: 1rem;
    padding: 1rem;
    & .icon {
        font-size: 1rem;
    }

    & .message {
        color: var(--color-text);
        flex-grow: 1;
        flex-shrink: 1;
        flex-basis: auto;
    }
}
h2 {
    margin-top: 1rem;
    font-weight: 600;
    font-size: 1.5em;
}
p {
    margin-top: 1rem;
}

.achivement {
    color: var(--color-theme-1);
    background-color: #EEF;
    padding: 0.5em 1em;
    border-radius: 1em;
}

pre {
    font-size: 0.7em;
}

.debug {
    font-size: 0.5em;
}

pre {
    white-space: pre-wrap;
}

button.primary {
    font-weight: 800;
    background: white;
    border-color: var(--color-theme-1);
    color: var(--color-theme-1); 
}
button.secondary {
    margin-top: 0.25rem;
    font-size: 0.8em;
}

.buttons {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    width: 100%;
    // margin-top: 1rem;
}
</style>
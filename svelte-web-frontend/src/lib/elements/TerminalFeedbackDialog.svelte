<script lang="ts">
// TerminalFeedbackDialog.svelte
//
// A component for offering feedback after a user has completed a
// practice attempt of a dance. 
import { reset } from 'microlight';
import type { TerminalFeedback } from '$lib/model/TerminalFeedback';
import type { BodyPartHighlight } from '$lib/elements/StaticSkeletonVisual.svelte';
import StaticSkeletonVisual from '$lib/elements/StaticSkeletonVisual.svelte';
import { createEventDispatcher, onMount } from 'svelte';
import { debugMode } from '$lib/model/settings';
import { replaceJSONForStringifyDisplay } from '$lib/utils/formatting';
import { goto } from '$app/navigation';
import CloseButton from './CloseButton.svelte';
import Dialog from './Dialog.svelte';
	import ProgressEllipses from './ProgressEllipses.svelte';

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
$: {
    const navigationButtons = (feedback?.navigateOptions ?? [])
        .map((option, i) => {
            return {
                title: `${option.label}`,
                action: async () => {
                    await goto(option.url)
                },
                debug: option.url
            } as ButtonData
        })

    if (feedback?.suggestedAction === 'navigate') {
        buttons = [navigationButtons[0], repeatButton, continueButton, ...navigationButtons.slice(1)];
    } else if (feedback?.suggestedAction === 'next') {
        buttons = [continueButton, repeatButton, ...navigationButtons];
    } else {
        buttons = [repeatButton, continueButton, ...navigationButtons];
    }
}

let showingPerformanceSummary = false;
let performanceSummaryDialog: HTMLDialogElement | undefined;
$: {
    if (showingPerformanceSummary) {
        performanceSummaryDialog?.showModal();
    } else {
        performanceSummaryDialog?.close();
    }
}
let showingLLMReflection = false;

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

$: $debugMode, feedback?.debug?.performanceSummary, reset('microlight'); // re-run microlight syntax highlighting

onMount(() => {
    reset('microlight');
});

function promptDownload(objUrl: string, filename: string) {
    const link = document.createElement('a');
    link.href = objUrl;
    link.download = filename;
    link.click();
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
    let trackDictionary = track.asDictWithoutTimeSeriesResults()
    trackDictionary = {
        ...trackDictionary,
        trackDescription,
    }
    const trackJson = JSON.stringify(trackDictionary, replaceJSONForStringifyDisplay);
    const blob = new Blob([trackJson], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    promptDownload(url, `${filenameRoot}.track.json`)

    const webcamRecording = feedback?.debug?.recordedVideoUrl;
    if (webcamRecording) {
        promptDownload(webcamRecording, `${filenameRoot}.userrecording.webm`)
    }
}

</script>

<div class="feedbackForm">
    <h2>{#if !feedback}Thinking<ProgressEllipses />{:else}{feedback?.headline}{/if}</h2>
    {#each feedback?.paragraphs ?? [] as paragraph}
        <p>{paragraph}</p>
    {/each}
    
    {#if feedback?.score}
        <p><code>Score: {feedback.score.achieved.toFixed(2)} / {feedback.score.maximumPossible.toFixed(2)}</code></p>
    {/if}
    {#each feedback?.incorrectBodyPartsToHighlight ?? [] as badbodypart}
        <p>Try focusing on your {badbodypart} next time.</p>
    {/each}
    {#if skeletonHighlights.length > 0}
    <div class="skeleton">
        <StaticSkeletonVisual 
            highlights={skeletonHighlights}
        />
    </div>
    {/if}
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
    {#if $debugMode}
        <div class="debug buttons">
            {#if feedback?.debug?.performanceSummary}
            <button class="button" on:click={() => showingPerformanceSummary = true }>
                View Performance Summary
            </button>
            <Dialog open={showingPerformanceSummary}
              on:dialog-closed={() => showingPerformanceSummary = false}>
                <span slot="title">Performance Summary</span>
                <pre class="dialogcontent microlight">{JSON.stringify(feedback.debug.performanceSummary, replaceJSONForStringifyDisplay, 2)}</pre>
            </Dialog>
            {/if}
            {#if feedback?.debug?.llmReflection}
            <button class="button" on:click={() => showingLLMReflection = true }>View LLM Reflection</button>
            <Dialog open={showingLLMReflection}
                on:dialog-closed={() => showingLLMReflection = false}>
                <span slot="title">LLM Reflection</span>
                <p>{feedback.debug.llmReflection}</p>
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
    gap: 0.25rem;
    overflow: scroll;
    font-size: 1.5rem;

    & p,h2 {
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
h2 {
    margin-top: 1rem;
    font-weight: 600;
    font-size: 1.5em;
}
p {
    margin-top: 1rem;
}

pre {
    font-size: 0.7em;
}

.debug {
    font-size: 0.5em;
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

dialog {
    max-height: calc(100vh - 2rem);
    box-sizing: border-box;
    font-size: 1rem;
    overflow-y: hidden;
}

dialog .close {
    display: inline-block;
    margin-left: auto;
    margin-right: auto;
}

dialog > .dialogcontent {
    max-height: 80vh;
    overflow-y: scroll;
}

.buttons {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    width: 100%;
    margin-top: 1rem;
}
</style>
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

const dispatch = createEventDispatcher();

export let feedback: TerminalFeedback | null = null;

let suggestingRepeat = false;
$: {
    suggestingRepeat = feedback?.suggestedAction === "repeat";
}

let primaryButtonTitle = "";
$: primaryButtonTitle = suggestingRepeat ? "Do Again 🔁" : "Continue ➡️";
let secondaryButtonTitle = "";
$: secondaryButtonTitle = suggestingRepeat ? "Continue ➡️" : "Do Again 🔁";

function primaryButtonClicked() {
    if(suggestingRepeat) {
        dispatch("repeat-clicked");
    } else {
        dispatch("continue-clicked");
    }
}
function secondaryButtonClicked() {
    if(suggestingRepeat) {
        dispatch("continue-clicked");
    } else {
        dispatch("repeat-clicked");
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

$: $debugMode, feedback?.debugJson, reset('microlight'); // re-run microlight syntax highlighting

onMount(() => {
    reset('microlight');
});

</script>

<div class="feedbackForm">
    <h2>{feedback?.headline ?? 'Thinking...'}</h2>
    <p class="sub-headline">{feedback?.subHeadline ?? ''}</p>
    
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
    {#if $debugMode && feedback?.debugJson}
    <pre class="microlight">{JSON.stringify(feedback.debugJson, replaceJSONForStringifyDisplay, 2)}</pre>
    {/if}
    <button class="button outlined thick primary" on:click={primaryButtonClicked}>{primaryButtonTitle}</button>
    <button class="button outlined thin secondary" on:click={secondaryButtonClicked}>{secondaryButtonTitle}</button>
</div>


<style lang="scss">
.feedbackForm {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-height: 100%;
    max-width: 100%;
    flex-shrink: 1;
    flex-grow: 1;
    gap: 0.25rem;
    overflow: hidden;
    font-size: 1.5rem;
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
    font-size: 0.75rem;
}

button.primary {
    font-weight: 800;
    background: white;
}
button.secondary {
    margin-top: 0.25rem;
    font-size: 0.8em;
}
</style>
<script lang="ts">
// TerminalFeedbackDialog.svelte
//
// A component for offering feedback after a user has completed a
// practice attempt of a dance. This content can be delivered through 
import type { TerminalFeedback } from '$lib/model/TerminalFeedback';
import StaticSkeletonVisual from '$lib/elements/StaticSkeletonVisual.svelte';
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();

export let feedback: TerminalFeedback | null = null;

let suggestingRepeat = false;
$: suggestingRepeat = feedback?.suggestedAction === "repeat";

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
</script>

<div class="feedbackForm">
    <h2>{feedback?.headline}</h2>
    <p class="sub-headline">{feedback?.subHeadline}</p>
    {#if feedback?.score}
        <p><code>Score: {feedback.score.achieved.toFixed(2)} / {feedback.score.maximumPossible.toFixed(2)}</code></p>
    {/if}
    {#each feedback?.incorrectBodyParts ?? [] as badbodypart}
        <p>Try focusing on your {badbodypart} next time.</p>
    {/each}
    <div class="skeleton">
        <StaticSkeletonVisual 
            highlightBodyParts={feedback?.incorrectBodyParts ?? []}
        />
    </div>
    <button class="outlined" on:click={primaryButtonClicked}>{primaryButtonTitle}</button>
    <button class="outlined thin" on:click={secondaryButtonClicked}>{secondaryButtonTitle}</button>
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
}
.skeleton {
    width: 100%;
    flex-grow: 1;
    max-height: 400px;
    text-align: center;
    padding: 1rem;
}
h2, p {
    margin : 0;
}
h2 {
    margin-top: 1rem;
    font-weight: 600;
    font-size: 1.5rem;
}

.sub-headline {
    margin-top: 0;
}
</style>
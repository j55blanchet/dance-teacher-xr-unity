<script lang="ts">
import { 
    debugMode, 
    pauseInPracticePage, 
    debugPauseDurationSecs,
    evaluation_GoodBadTrialThreshold,
    feedback_YellowThreshold,
    feedback_GreenThreshold,
    resetSettingsToDefault,
    pauseDurationMin,
    pauseDurationMax,
    stepMin,
    stepMax,
    useAIFeedback,
    evaluation_summarizeSubsections,
    evaluation_summarizeSubsectionsOptions,

	useTextToSpeech

} from "$lib/model/settings";
import { lerp } from "$lib/utils/math";


// A little mechanism for making the step sizes for the debug pause duration slider
// increase as the value increases. This is to make it easier to select a value
// precisely when the value is small, and easier to select a value quickly when
// the value is large.
let pauseDurationStep = 0.1;
$: pauseDurationStep = Math.round(10 * lerp(
    $debugPauseDurationSecs, 
    pauseDurationMin, 
    pauseDurationMax, 
    stepMin, 
    stepMax, 
    true
)) / 10;

const qijiaScoreMin = 0;
const qijiaScoreMax = 5;
</script>

<section class="settingsPage">
    <div class="group">
        <h3>General Settings</h3>
        <div>
            <label for="debugMode">Debug Mode</label>
            <input type="checkbox" name="debugMode" bind:checked={$debugMode}>
        </div>
        <div>
            <label for="pauseInPracticePage">Pause in Practice Page</label>
            <input type="checkbox" name="pauseInPracticePage" bind:checked={$pauseInPracticePage}>
        </div>
        <div>
            <label for="debugPauseDuration">Debug Pause Duration</label>
            <input class="outlined thin" type="number" name="debugPauseDuration" bind:value={$debugPauseDurationSecs} min={pauseDurationMin} max={pauseDurationMax} step={pauseDurationStep}>
        </div>
    </div>
    <div class="group">
        <h3>Live Feedback</h3>
        <div>
            <label for="feedback_YellowThreshold">Yellow Threshold</label>
            <input class="outlined thin" type="number" name="feedback_YellowThreshold" bind:value={$feedback_YellowThreshold} min={qijiaScoreMin} max={qijiaScoreMax} step={0.1}>
        </div>
        <div>
            <label for="feedback_GreenThreshold">Green Threshold</label>
            <input class="outlined thin" type="number" name="feedback_GreenThreshold" bind:value={$feedback_GreenThreshold} min={qijiaScoreMin} max={qijiaScoreMax} step={0.1}>
        </div>
    </div>
    <div class="group">
        <h3>Summary Feedback</h3>
        <div>
            <label for="useAIFeedback">Use AI Feedback</label>
            <input type="checkbox" name="useAIFeedback" bind:checked={$useAIFeedback}>
        </div>
        <div>
            <label for="useTextToSpeech">Use Text to Speech</label>
            <input type="checkbox" name="useTextToSpeech" bind:checked={$useTextToSpeech}>
        </div>
        <div>
            <label for="evaluation_GoodBadTrialThreshold">Good/Bad Trial Threshold</label>
            <input class="outlined thin" type="number" name="evaluation_GoodBadTrialThreshold" disabled={$useAIFeedback} bind:value={$evaluation_GoodBadTrialThreshold} min={qijiaScoreMin} max={qijiaScoreMax} step={0.1}>
        </div>
        <div>
            <label for="evaluation_summarizeSubsections">Evaluate Subsections</label>
            <select class="outlined thin" name="evaluation_summarizeSubsections" bind:value={$evaluation_summarizeSubsections}>
                {#each Object.entries(evaluation_summarizeSubsectionsOptions) as [optionValue, optionTitle]}
                    <option value={optionValue}>{optionTitle}</option>
                {/each}
            </select>
        </div>
    </div>
    <div>
        <button class="button" on:click={resetSettingsToDefault}>Reset Settings</button>
    </div>    
</section>



<style lang="scss">
.settingsPage {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    height: var(--content_height);
    padding: 1rem;
    box-sizing: border-box;
    gap: 0.5rem;
}
div.group {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    gap: 0.5rem;
    width: 100%;
    // border: 1px solid lightgray;
    padding: 1rem;
    box-sizing: border-box;

    & h3 {
        font-size: 1em;
        margin: 0;
        border-bottom: 1px solid lightgray;
    }
}

input[type=number] {
    width: 4em;
    font-size: 1em;
}

</style>
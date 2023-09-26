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
        <input type="number" name="debugPauseDuration" bind:value={$debugPauseDurationSecs} min={pauseDurationMin} max={pauseDurationMax} step={pauseDurationStep}>
    </div>
    <div>
        <label for="evaluation_GoodBadTrialThreshold">Good/Bad Trial Threshold</label>
        <input type="number" name="evaluation_GoodBadTrialThreshold" bind:value={$evaluation_GoodBadTrialThreshold} min={qijiaScoreMin} max={qijiaScoreMax} step={0.1}>
    </div>
    <div>
        <label for="feedback_YellowThreshold">Yellow Threshold</label>
        <input type="number" name="feedback_YellowThreshold" bind:value={$feedback_YellowThreshold} min={qijiaScoreMin} max={qijiaScoreMax} step={0.1}>
    </div>
    <div>
        <label for="feedback_GreenThreshold">Green Threshold</label>
        <input type="number" name="feedback_GreenThreshold" bind:value={$feedback_GreenThreshold} min={qijiaScoreMin} max={qijiaScoreMax} step={0.1}>
    </div>
    <div>
        <label for="useAIFeedback">Use AI Feedback</label>
        <input type="checkbox" name="useAIFeedback" bind:checked={$useAIFeedback}>
    </div>
    <div>
        <button on:click={resetSettingsToDefault}>Reset Settings</button>
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
</style>
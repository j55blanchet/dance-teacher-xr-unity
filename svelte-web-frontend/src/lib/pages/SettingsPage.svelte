<script lang="ts">
import frontendPerformanceHistory from "$lib/ai/frontendPerformanceHistory";
import { 
    debugMode, 
    debugMode__viewBeatsOnDanceTreepage,
    debugMode__viewDanceMenuAsList,
    debugMode__addPlaceholderAchievement,
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
	useTextToSpeech,
	practiceFallbackPlaybackSpeed,
    practicePage__enablePerformanceRecording,
	summaryFeedback_skeleton3d_mediumPerformanceThreshold,
    summaryFeedback_skeleton3d_goodPerformanceThreshold,
	danceVideoVolume,
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

function clearPerformanceHistory() {
    if (!confirm('Are you sure you want to erase all performance history?')) {
        return;
    }
    frontendPerformanceHistory.clearAllHistory();
}
</script>

<section class="settingsPage">
    <div class="group">
        <h3>General Settings</h3>
        <div>
            <label for="debugMode">Debug Mode</label>
            <input type="checkbox" name="debugMode" bind:checked={$debugMode}>
        </div>
    </div>
    {#if $debugMode}
    <div class="group">
        <h3>Debug Settings</h3>
        <div>
            <label for="debugMode__viewBeatsOnDanceTreepage">View Beats on Dance Tree Page</label>
            <input type="checkbox" name="debugMode__viewBeatsOnDanceTreepage" bind:checked={$debugMode__viewBeatsOnDanceTreepage}>
        </div>
        <div>
            <label for="debugMode__viewDanceMenuAsList">View Dance Menu as List</label>
            <input type="checkbox" name="debugMode__viewDanceMenuAsList" bind:checked={$debugMode__viewDanceMenuAsList}>
        </div>
        <div>
            <label for="debugMode__addPlaceholderAchievement">Add placeholder achievement</label>
            <input type="checkbox" name="debugMode__addPlaceholderAchievement" bind:checked={$debugMode__addPlaceholderAchievement}>
        </div>
    </div>
    {/if}
    <div class="group">
        <h3>Practice Page</h3>
        {#if $debugMode}
        <div>
            <label for="practiceFallbackPlaybackSpeed">Fallback Speed</label>
            <input class="outlined thin" type="number" name="practiceFallbackPlaybackSpeed" bind:value={$practiceFallbackPlaybackSpeed} min={0.1} max={1.5} step={0.05}>
        </div>
        <div>
            <label for="pauseInPracticePage">Add midway Pause</label>
            <input type="checkbox" name="pauseInPracticePage" bind:checked={$pauseInPracticePage}>
        </div>
        <div>
            <label for="debugPauseDuration">Debug Pause Duration</label>
            <input class="outlined thin" type="number" name="debugPauseDuration" bind:value={$debugPauseDurationSecs} min={pauseDurationMin} max={pauseDurationMax} step={pauseDurationStep}>
        </div>
        <div>
            <label for="feedback_YellowThreshold">Live Feedback - Yellow Threshold</label>
            <input class="outlined thin" type="number" name="feedback_YellowThreshold" bind:value={$feedback_YellowThreshold} min={qijiaScoreMin} max={qijiaScoreMax} step={0.1}>
        </div>
        <div>
            <label for="feedback_GreenThreshold">Live Feedback - Green Threshold</label>
            <input class="outlined thin" type="number" name="feedback_GreenThreshold" bind:value={$feedback_GreenThreshold} min={qijiaScoreMin} max={qijiaScoreMax} step={0.1}>
        </div>
        {/if}
        <div>
            <label for="practicePage__enablePerformanceRecording">Record Performances</label>
            <input type="checkbox" name="practicePage__enablePerformanceRecording" bind:checked={$practicePage__enablePerformanceRecording}>
        </div>
        <div>
            <label for="danceVideoVolume">Dance Video Volume</label>
            <input class="outlined thin" type="range" name="danceVideoVolume" bind:value={$danceVideoVolume} min={0} max={1} step={0.05}>
            <input class="outlined thin" type="number" name="danceVideoVolume" bind:value={$danceVideoVolume} min={0} max={1} step={0.05}>
        </div>
    </div>
    {#if $debugMode}
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
            <label for="evaluation_GoodBadTrialThreshold">(Rule Based Feedback)<br />Good/Bad Trial Threshold</label>
            <input class="outlined thin" type="number" name="evaluation_GoodBadTrialThreshold" disabled={$useAIFeedback} bind:value={$evaluation_GoodBadTrialThreshold} min={qijiaScoreMin} max={qijiaScoreMax} step={0.1}>
        </div>
        <div>
            <label for="summaryFeedback_skeleton3d_mediumPerformanceThreshold">3D Angle - Yellow Threshold</label>
            <input class="outlined thin" type="number" name="summaryFeedback_skeleton3d_mediumPerformanceThreshold" bind:value={$summaryFeedback_skeleton3d_mediumPerformanceThreshold} min={0} max={1} step={0.01}>
        </div>
        <div>
            <label for="summaryFeedback_skeleton3d_goodPerformanceThreshold">3D Angle - Green Threshold</label>
            <input class="outlined thin" type="number" name="summaryFeedback_skeleton3d_goodPerformanceThreshold" bind:value={$summaryFeedback_skeleton3d_goodPerformanceThreshold} min={0} max={1} step={0.01}>
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
        <button class="button" disabled={Object.keys($frontendPerformanceHistory).length === 0} on:click={clearPerformanceHistory}>Clear Performance History</button>
    </div>
    {/if}
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


div.group > div {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
}

input[type=number] {
    width: 4em;
    font-size: 1em;
}

input[type=range] {
    width: 7em;
}

</style>
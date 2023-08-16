<script lang="ts">
import { debugMode, pauseInPracticePage, debugPauseDurationSecs } from "$lib/model/settings";
import { lerp } from "$lib/utils/math";


// A little mechanism for making the step sizes for the debug pause duration slider
// increase as the value increases. This is to make it easier to select a value
// precisely when the value is small, and easier to select a value quickly when
// the value is large.
const pauseDurationMin = 0.1;
const pauseDurationMax = 120;
const stepMin = 0.1;
const stepMax = 5;
let pauseDurationStep = 0.1;
$: pauseDurationStep = Math.round(10 * lerp(
    $debugPauseDurationSecs, 
    pauseDurationMin, 
    pauseDurationMax, 
    stepMin, 
    stepMax, 
    true
)) / 10;

</script>

<section class="settingsPage">
    <nav>
        <a class="button outlined" href="/">&lt; Home</a>
    </nav>
    <h1>Settings</h1>

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

</section>



<style lang="scss">
.settingsPage {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    height: 100vh;
}

nav {
    width: 100%;
    padding: 1rem;
}
</style>
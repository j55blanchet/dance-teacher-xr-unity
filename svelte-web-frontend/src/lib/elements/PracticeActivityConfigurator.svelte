<script lang="ts">
import type { GeneratePracticeStepOptions } from "$lib/ai/TeachingAgent";
import { PracticeInterfaceModeOptions, type PracticeStepModeKey } from "$lib/model/PracticeStep";
import { practiceActivities__playbackSpeed, practiceActivities__showUserSkeleton, practiceActivities__terminalFeedbackEnabled, practiceActivities__interfaceMode } from "$lib/model/settings";

export let persistInSettings = false;
export let practiceActivityParams: GeneratePracticeStepOptions = {
    playbackSpeed: $practiceActivities__playbackSpeed,
    interfaceMode: $practiceActivities__interfaceMode,
    terminalFeedbackEnabled: $practiceActivities__terminalFeedbackEnabled,
    showUserSkeleton: $practiceActivities__showUserSkeleton,
}

$: {
    if (persistInSettings) {
        $practiceActivities__playbackSpeed = practiceActivityParams.playbackSpeed;
        $practiceActivities__terminalFeedbackEnabled = practiceActivityParams.terminalFeedbackEnabled;
        $practiceActivities__showUserSkeleton = practiceActivityParams.showUserSkeleton;
    }
}

let isShowSkeletonSettingVisible: boolean;
const showSkeletonSettingVisibleConditions: PracticeStepModeKey[] = ['bothVideos', 'userVideoOnly'];
$: showSkeletonSettingVisible = showSkeletonSettingVisibleConditions.indexOf(practiceActivityParams.interfaceMode) >= 0;
</script>

<div class="practiceActivityConfigurator">
    <div class="control">
        <label for="playbackSpeed">Speed:</label>
        <input class="" type="range" name="playbackSpeed" bind:value={practiceActivityParams.playbackSpeed} min="0.4" max="1.3" step="0.1" />
        {practiceActivityParams.playbackSpeed.toFixed(1)}x
    </div>
    <div class="control interfaceMode" >
        {#each Object.entries(PracticeInterfaceModeOptions) as [modeOptionValue, modeOptionTitle]}
        <label class="button outlined thin" class:selected={modeOptionValue === practiceActivityParams.interfaceMode }>
            <input type="radio" name="practiceActivityInterfaceMode" value={modeOptionValue} bind:group={practiceActivityParams.interfaceMode}/>
            {modeOptionTitle}
        </label>
        {/each}
    </div>
    {#if showSkeletonSettingVisible}
    <div class="control">
        <label for="enableUserSkeletonColorCoding">Show Skeleton:</label>
        <input  class="" type="checkbox" name="enableUserSkeletonColorCoding" bind:checked={practiceActivityParams.showUserSkeleton} />
    </div>
    {/if}
    <div class="control">
        <label for="terminalFeedbackEnabled">Provide Feedback:</label>
        <input  class="" type="checkbox" name="terminalFeedbackEnabled" bind:checked={practiceActivityParams.terminalFeedbackEnabled} />
    </div>
</div>

<style lang="scss">

.practiceActivityConfigurator {
    display: flex;
    flex-direction: column;
    // grid-template-rows: "label" auto "input" auto;
    gap: 0.5rem;
    margin: 0rem 0 1rem 0;
    display: flex;
}

.control > label > input {
    margin-right: 0.5rem;
}

// .control {
//     display: flex;
//     flex-direction: row; 
//     align-items: center;
//     justify-content: center;
//     gap: 0.5ch;

//     input[type="range"] {
//         max-width: 10ch;
//     }

//     &.interfaceMode {
//         margin: 0.5rem 0;
//     }

//     &.interfaceMode label {
//         box-sizing: border-box;
//         padding: 0.25em;
//         width: 5em;
//         height: 5em;
//         display: flex;
//         align-items: center;
//         justify-content: center;
//         text-align: center;
//         // border-radius: var(--std-border-radius);
//         box-shadow: 2px 2px 2px 2px rgba(0, 0, 0, 0.3);

//         & input {
//             position:absolute;
//             left: -50%;
//             opacity: 0;
//             width: 0;
//             height: 0;

//         }

//         //&:has( > input:checked) {
//         //    color: red;
//         //}

//         &.selected {
//             color: var(--color-theme-1);
//             border-color: var(--color-theme-1);
//             border-width: 3px;
//             background: white;
//         }
//     }

//     // &.interfaceMode label:has(input[selected=true])
// }
</style>
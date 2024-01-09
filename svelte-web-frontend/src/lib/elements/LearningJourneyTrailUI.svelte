<script lang="ts">
	import PracticeStepList from './PracticeStepList.svelte';
	import type { PracticePlanProgress } from '$lib/data/activity-progress';
	import type { PracticePlan, PracticePlanActivity, PracticePlanActivityBase } from '$lib/model/PracticePlan';
	import type PracticeStep from '$lib/model/PracticeStep';
    import { createEventDispatcher } from 'svelte';

    export let practicePlan: PracticePlan;
    export let practicePlanProgress: PracticePlanProgress | undefined;

    let dropdownActivityId: string | undefined = undefined;
    const dispatch = createEventDispatcher<{
        activityClicked: PracticePlanActivity;
        practiceStepClicked: { activity: PracticePlanActivity, step: PracticeStep };
    }>();

    function onActivityClicked(activity: PracticePlanActivity) {
        const shouldContinue = dispatch('activityClicked', activity, { cancelable: true });
        if (!shouldContinue) {
            return;
        }

        if (dropdownActivityId === activity.id) {
            dropdownActivityId = undefined
        } else {
            dropdownActivityId = activity.id;
        }
    }

    function isActivityComplete(activity: PracticePlanActivity, progress: PracticePlanProgress) {
        return activity.steps.reduce(
            (acc, step) => acc && (
                (practicePlanProgress?.[activity.id]?.[step.id]?.completed) ?? false), 
                true
        );
    }
    function getActivityCompletionPercent(activity: PracticePlanActivity, progress: PracticePlanProgress) {
        const numSteps = activity.steps.length;
        const numCompletedSteps = activity.steps.reduce(
            (acc, step) => acc + (
                (practicePlanProgress?.[activity.id]?.[step.id]?.completed) ? 1 : 0), 
                0
        );
        return numCompletedSteps / numSteps;
    }

    let nextSuggestedActivity = undefined as undefined | PracticePlanActivityBase;
    function nextIncompleteActivity(progress: PracticePlanProgress | undefined) {

        if (progress === undefined) {
            return practicePlan.stages[0].activities[0];
        }

        const allActivities = practicePlan.stages.flatMap(stage => stage.activities);
        const firstIncompleteActivity = allActivities.find(
            activity => !isActivityComplete(activity, progress!)
        );

        return firstIncompleteActivity;
    }
    $: nextSuggestedActivity = nextIncompleteActivity(practicePlanProgress);
    let nextSuggestedStep = undefined as undefined | PracticeStep;
    $: practicePlanProgress, nextSuggestedStep = (nextSuggestedActivity?.steps ?? []).find(
        step => {
            const progressStatus = practicePlanProgress?.[nextSuggestedActivity?.id ?? '']?.[step.id];
            const isCompleted = progressStatus?.completed ?? false;
            return !isCompleted
        }
    );

    function onPracticeStepClicked(activity: PracticePlanActivity, step: PracticeStep) {
        dispatch('practiceStepClicked', { activity, step });
    }

    let isVeryFirstActivityStep: boolean;
    $: isVeryFirstActivityStep = practicePlanProgress === undefined || Object.values(practicePlanProgress).reduce(
        (nonCompleteSoFar, activityProgress) => nonCompleteSoFar && Object.values(activityProgress).reduce(
            (noStepCompleteSoFar, stepProgress) => noStepCompleteSoFar && !stepProgress.completed, 
            true
        ), 
        true
    
    );
</script>

<!-- <details class="daisy-collapse bg-base-200">
    <summary class="daisy-collapse-title text-xl font-medium">nextSuggestedActivity</summary>
    <div class="daisy-collapse-content max-h-80 overflow-y-auto"> 
        <pre>{JSON.stringify(nextSuggestedActivity, undefined, 2)}</pre>
    </div>
</details> -->

<!-- <details class="daisy-collapse bg-base-200">
    <summary class="daisy-collapse-title text-xl font-medium">nextSuggestedStep</summary>
    <div class="daisy-collapse-content max-h-80 overflow-y-auto"> 
        <pre>{JSON.stringify(nextSuggestedStep, undefined, 2)}</pre>
    </div>
</details> -->

<div class="is-flex is-flex-direction-column learning-journey is-align-items-center is-relative">
    {#each practicePlan.stages as stage, stage_i}
    <div class="is-flex is-flex-direction-row learning-group is-justify-content-center is-relative is-flex-wrap-wrap">
        {#each stage.activities as activity, activity_i}
            {@const isComplete = practicePlanProgress?.[activity.id] !== undefined && 
                    isActivityComplete(activity, practicePlanProgress)
            }
            {@const percentComplete = practicePlanProgress?.[activity.id] !== undefined 
                    ? getActivityCompletionPercent(activity, practicePlanProgress) 
                    : 0
            }
            {@const isActivitySuggested = nextSuggestedActivity?.id === activity.id}
            {@const isDropdownMode = !isActivitySuggested}
            {@const dropdownOpen = dropdownActivityId === activity.id}
            {@const activitySuggestedStepId = isActivitySuggested ? nextSuggestedStep?.id : undefined}

            <div class="flex flex-col items-center justify-start"
            >
                <details class="" 
                    class:daisy-dropdown={isDropdownMode}
                    class:is-active={isDropdownMode && dropdownOpen}
                    class:daisy-dropdown-open={isDropdownMode && dropdownOpen}>
                    <summary
                        role="button"
                        tabindex="0" 
                        class:daisy-btn={isDropdownMode}
                        class:bg-base-300={isActivitySuggested}
                        class:rounded-full={isDropdownMode}
                        class:rounded-t-full={!isDropdownMode}
                        class:rounded-b-lg={!isDropdownMode}
                        class:border-b-4={!isDropdownMode}
                        class:border-b-primary={!isDropdownMode}
                        class="size-32 flex justify-center items-center" 
                        on:click={() => { onActivityClicked(activity); }}
                        class:daisy-btn-success={isDropdownMode && isComplete}
                        >
                        {#if activity.type === 'segment'}
                            <span class="segment-body has-background-light has-text-dark">
                                { activity.segmentTitle }
                            </span>
                        {:else if activity.type === 'checkpoint'}
                            Checkpoint
                        {:else if activity.type === 'drill'}
                            Drill
                        {:else if activity.type === 'finale'}
                            Finale
                        {:else}
                            Unknown
                        {/if}
                        </summary>
                    {#if isDropdownMode}
                    <div class="daisy-dropdown-content  z-[1] daisy-card daisy-card-compact w-64 p-2 shadow"
                        class:bg-primary={isActivitySuggested} 
                        class:text-primary-content={isActivitySuggested}
                        class:bg-base-200={!isActivitySuggested}
                        class:text-base-content={!isActivitySuggested}>
                        <div class="daisy-card-body p-0">
                        <!-- <h3 class="daisy-card-title">Card title!</h3> -->
                        <PracticeStepList 
                            {activity}
                            {practicePlanProgress} 
                            on:practiceStepClicked={(e) => onPracticeStepClicked(e.detail.activity, e.detail.step)}
                            stepClasses="hover:bg-base-100"
                        />
                        </div>
                    </div>
                    {/if}
                </details>
                {#if isActivitySuggested}
                <div class="p-2 bg-base-200 rounded-box">
                    <PracticeStepList 
                        {activity} 
                        {practicePlanProgress}
                        suggestedStepId={activitySuggestedStepId}
                        on:practiceStepClicked={(e) => onPracticeStepClicked(e.detail.activity, e.detail.step)}
                        suggestedStepTooltip={isVeryFirstActivityStep ? "Try this first!": "Try this next!"}
                        stepClasses="hover:bg-base-100"
                        ></PracticeStepList>
                </div>
            {/if}
            </div>
        {/each}
    </div>
    {/each}
</div>

<style lang="scss">

    .learning-journey {
        gap: 5rem;
    }
    .learning-group {
        gap: 1rem;
    }

    .segment-body {
        padding: 0.25rem 2rem;
        border-radius: 9999px;
        background: green;
    }
</style>
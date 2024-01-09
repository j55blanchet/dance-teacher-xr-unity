<script lang="ts">
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

    function onPracticeStepClicked(activity: PracticePlanActivity, step: PracticeStep) {
        dispatch('practiceStepClicked', { activity, step });
    }
</script>

<pre>{JSON.stringify(practicePlanProgress, undefined, 2)}</pre>
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
            {@const isSuggested = nextSuggestedActivity?.id === activity.id}

            <div class="dropdown" class:is-active={isSuggested}>
                <div class="dropdown-trigger">
                    <div  
                        data-tip={isSuggested ? "Start here!" : ""}
                        class="daisy-tooltip-primary"
                        class:daisy-tooltip={isSuggested}
                        class:daisy-tooltip-open={isSuggested}>
                        <button class="button is-rounded activity-button" 
                            on:click={() => onActivityClicked(activity)}
                            class:is-primary={activity.id === nextSuggestedActivity?.id}
                            class:is-success={nextSuggestedActivity?.id !== activity.id && isComplete}
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

                            <!-- {#if isComplete}
                            <span class="iconify-[lucide--check] size-6 md:size-7"></span>
                            {:else if percentComplete > 0}
                                {(percentComplete * 100).toFixed(0)}%
                            {/if} -->

                        </button>
                    </div>
                </div>
                <div class="dropdown-menu">
                    <div class="dropdown-content has-background-primary">
                        {#each activity.steps as step, i}
                        <div class="dropdown-item">    
                            <button class="button is-fullwidth" on:click={() => onPracticeStepClicked(activity, step)}>
                                {step.title}
                            </button>
                        </div>
                        {/each}
                    </div>
                </div>
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
    .activity-button {
        width: 96px;
        height: 96px;
        box-sizing: border-box;
    }

    .segment-body {
        padding: 0.25rem 2rem;
        border-radius: 9999px;
        background: green;
    }
</style>
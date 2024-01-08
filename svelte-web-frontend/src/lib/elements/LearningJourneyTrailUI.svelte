<script lang="ts">
	import type { PracticePlan, PracticePlanActivity, PracticePlanActivityBase } from '$lib/model/PracticePlan';
    import { createEventDispatcher } from 'svelte';

    export let practicePlan: PracticePlan;
    export let suggestedActivityId: string | undefined = undefined;

    let dropdownActivityId: string | undefined = undefined;
    const dispatch = createEventDispatcher<{
        activityClicked: PracticePlanActivity;
        practiceStepClicked: { activity: PracticePlanActivity, stepIndex: number };
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

    function onPracticeStepClicked(activity: PracticePlanActivity, stepIndex: number) {
        dispatch('practiceStepClicked', { activity, stepIndex });
    }
</script>

<div class="is-flex is-flex-direction-column learning-journey is-align-items-center is-relative">
    {#each practicePlan.stages as stage, stage_i}
    <div class="is-flex is-flex-direction-row learning-group is-justify-content-center is-relative is-flex-wrap-wrap">
        {#each stage.activities as activity, activity_i}
            <div class="dropdown" class:is-active={activity.id === dropdownActivityId}>
                <div class="dropdown-trigger">
                    <div  
                        data-tip={stage_i === 0 && activity_i === 0 ? "Start here!" : ""}
                        class="daisy-tooltip-primary"
                        class:daisy-tooltip={stage_i === 0 && activity_i === 0}
                        class:daisy-tooltip-open={stage_i === 0 && activity_i === 0}>
                        <button class="button is-rounded activity-button" 
                            on:click={() => onActivityClicked(activity)}
                            class:is-primary={activity.id === suggestedActivityId}
                            class:is-success={suggestedActivityId !== activity.id && activity.state?.completed}
                            disabled={activity.state?.locked}
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
                        </button>
                    </div>
                </div>
                <div class="dropdown-menu">
                    <div class="dropdown-content has-background-primary">
                        {#each activity.steps as step, i}
                        <div class="dropdown-item">    
                            <button class="button is-fullwidth" on:click={() => onPracticeStepClicked(activity, i)}>
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
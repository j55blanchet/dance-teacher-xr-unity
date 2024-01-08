<script lang="ts">
	import type { PracticePlan, PracticePlanActivity } from '$lib/model/PracticePlan';
    import { createEventDispatcher } from 'svelte';

    export let practicePlan: PracticePlan;
    export let suggestedActivityId: string | undefined = undefined;

    const dispatch = createEventDispatcher<{
        activityClicked: PracticePlanActivity;
    }>();

</script>

<div class="is-flex is-flex-direction-column learning-journey is-align-items-center is-relative">
    {#each practicePlan.stages as stage}
    <div class="is-flex is-flex-direction-row learning-group is-justify-content-center is-relative is-flex-wrap-wrap">
        {#each stage.activities as activity(activity.id)}
            <button class="button is-rounded activity-button" 
                on:click={() => dispatch('activityClicked', activity)}
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
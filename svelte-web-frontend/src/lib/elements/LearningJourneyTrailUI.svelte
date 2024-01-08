<script lang="ts">
	import type { PracticePlan } from '$lib/model/PracticePlan';
    import { createEventDispatcher } from 'svelte';

    export let practicePlan: PracticePlan;
    export let suggestedActivityId: string | undefined = undefined;

    const dispatch = createEventDispatcher();

</script>

<div class="is-flex is-flex-direction-column learning-journey is-align-items-center is-relative">
    {#each practicePlan.stages as stage}
    <div class="is-flex is-flex-direction-row learning-group m-5 is-justify-content-center is-relative">
        {#each stage.activities as activity(activity.id)}
            <button class="button is-rounded activity-button m-4" on:click={() => dispatch('activityClicked', activity)}
                class:is-primary={activity.id === suggestedActivityId}
                class:is-success={suggestedActivityId !== activity.id && activity.state?.completed}
                disabled={activity.state?.locked}
                >
                {#if activity.type === 'segment'}
                    Learn '{ activity.segmentTitle }'
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

    .activity-button {
        width: 128px;
        height: 128px;
        box-sizing: border-box;
    }
</style>
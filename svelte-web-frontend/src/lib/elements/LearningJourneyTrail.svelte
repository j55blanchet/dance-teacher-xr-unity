<script lang="ts" context="module">
export type SegmentActivityButtonData = {
    id: string;
    type: 'segment';
    segmentId: string;
    // segmentTitle: string;
}
export type SegmentActivityCheckpointData = {
    id: string;
    type: 'checkpoint';
}
export type SegmentActivityDrillData = {
    id: string;
    type: 'drill';
}
export type SegmentActivityFinaleData = {
    id: string;
    type: 'finale';
}

export type LearningActivityData = SegmentActivityButtonData | 
    SegmentActivityCheckpointData | 
    SegmentActivityDrillData | 
    SegmentActivityFinaleData;

export type LearningActivityGroup = {
    id: string;
    // title?: string;
    activities: LearningActivityData[];
}
export type LearingJourney = {
    learningGroups: LearningActivityGroup[];
}
</script>
<script lang="ts">
    import { createEventDispatcher } from 'svelte';

    export let learningJourneyData: LearingJourney;

    const dispatch = createEventDispatcher();


</script>

<div class="is-flex is-flex-direction-column learning-journey is-align-items-center is-relative">
    {#each learningJourneyData.learningGroups as learningGroup(learningGroup.id)}
    <div class="is-flex is-flex-direction-row learning-group m-5 is-justify-content-center is-relative">
        <div class="is-overlay hline">bb</div>
        {#each learningGroup.activities as activity(activity.id)}
            <button class="button is-primary is-rounded activity-button m-4" on:click={() => dispatch('activityClicked', activity)}>
                {#if activity.type === 'segment'}
                    Learn '{ activity.segmentId }'
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

    @import '../../routes/styles.scss';

    .activity-button {
        width: 128px;
        height: 128px;
        box-sizing: border-box;
        aspect-ratio: 1/1;
    }

    .hline {
        left: calc(1rem + 64px);
        width: calc(100% - 2rem - 128px);
        height: 1rem;
        top: calc(50% - 0.5rem);
        background: #{$brown};
    }
</style>
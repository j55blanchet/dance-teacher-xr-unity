<script lang="ts">
	import LearningJourneyTrail from '../../../lib/elements/LearningJourneyTrailUI.svelte';
	import type { Dance } from "$lib/data/dances-store.js";
	import type { LearningJourneyUIData, LearningActivityGroupUIData, SegmentActivityButtonData } from "$lib/elements/LearningJourneyTrailUI.svelte";
	import { navbarProps } from "$lib/elements/NavBar.svelte";


    export let data;
    let dance: Dance;
    $: dance = data.dance;

    $: {
        navbarProps.update(props => ({
            ...props,
            collapsed: false,
            pageTitle: dance?.title,
            subtitle: `Dashboard`,
            back: {
                url: '/',
                title: 'Home',
            },
        }));
    }

    const learningJourney: LearningJourneyUIData = {
        learningGroups: [
            {
                id: 'group1',
                activities: [
                    {
                        id: 'activity1',
                        type: 'segment',
                        segmentId: 'A',
                    },
                    {
                        id: 'activity2',
                        type: 'segment',
                        segmentId: 'B',
                    },
                    {
                        id: 'activity3',
                        type: 'segment',
                        segmentId: 'C',
                    },
                    {
                        id: 'activity4',
                        type: 'checkpoint',
                    }
                ]
            },
            {
                id: 'group2',
                activities: [
                    {
                        id: 'activity5',
                        type: 'segment',
                        segmentId: 'D',
                    },
                    {
                        id: 'activity6',
                        type: 'segment',
                        segmentId: 'E',
                    },
                    {
                        id: 'activity7',
                        type: 'checkpoint',
                    }
                ]
            },
            {
                id: 'group3',
                activities: [
                    {
                        id: 'activity8',
                        type: 'drill',
                    },
                    {
                        id: 'activity2',
                        type: 'finale'
                    },
                ]
            }
        ]
    };
</script>

<svelte:head>
    <title>{dance.title} Learning Dashboard</title>
    <meta name="description" content="App for learning the dance: {dance.title}" />
</svelte:head>

<section class="section">
    <div class="columns is-centered">
        <div class="column is-narrow">
            <div class="box">
                <h3 class="is-size-4">Preview</h3>
            </div>
        </div>
        <div class="column is-narrow">
            <div class="box">
                <h3 class="is-size-4">Practice</h3>
                <LearningJourneyTrail uiData={learningJourney}/>
            </div>
        </div>
        <div class="column is-narrow">
            <div class="box">
                <h3 class="is-size-5">Stats</h3>
                Stats
            </div>
            <div class="box">
                <h3 class="is-size-5">Achievements</h3>
                Achievements
            </div>
        </div>
    </div>
</section>
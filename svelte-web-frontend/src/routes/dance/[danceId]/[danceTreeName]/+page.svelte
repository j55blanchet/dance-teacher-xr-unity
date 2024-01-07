<script lang="ts">
	import VideoWithSkeleton from '$lib/elements/VideoWithSkeleton.svelte';
	import LearningJourneyTrail from '../../../../lib/elements/LearningJourneyTrailUI.svelte';
	import { getDanceVideoSrc, type Dance } from "$lib/data/dances-store.js";
	import type { LearningJourneyUIData, LearningActivityGroupUIData, SegmentActivityButtonData } from "$lib/elements/LearningJourneyTrailUI.svelte";
	import { navbarProps } from "$lib/elements/NavBar.svelte";
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { getContext } from 'svelte';
    
    export let data;

    let supabase: SupabaseClient = getContext('supabase');
    
    let dance: Dance;
    $: dance = data.dance;
    let danceSrc: string = '';
    $: {
        danceSrc = getDanceVideoSrc(supabase, dance);
    }

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

<section class="learning-dashboard p-5">
    
    <div class="preview-video-container">
        <div class="box p-0 video-wrapper">
            <VideoWithSkeleton 
                dance={dance}
                controls={{
                    showPlayPause: true,
                    showProgressBar: true,
                    enablePlayPause: true,
                    progressBarProps: {}
                }}
                >
                <source src={danceSrc} type="video/mp4" />
            </VideoWithSkeleton>
        </div>
    </div>

    <div class="box learning-journey">
        <h3 class="is-size-4">Practice</h3>
        <LearningJourneyTrail uiData={learningJourney}/>
    </div>

    <!-- <div class="column is-narrow">
        <div class="box">
            <h3 class="is-size-5">Stats</h3>
            Stats
        </div>
        <div class="box">
            <h3 class="is-size-5">Achievements</h3>
            Achievements
        </div>
    </div> -->
    
</section>


<style lang="scss">
.learning-dashboard {
    height: var(--content_height);
    box-sizing: border-box;
    overflow: hidden;
    display: grid;
    grid-template: 
        'preview journey' 1fr / 
        minmax(320px, auto) 1fr
        ;
    gap: var(--std-block-spacing);
}

.preview-video-container {
    grid-area: 'preview';
    overflow: hidden;
    max-height: calc(100%);
    align-self: center;
    justify-self: right;
}

.video-wrapper {
    display: flex;
    max-height: 100%;
    overflow: hidden;
}

.learning-journey {
    grid-area: 'journey';
}
</style>
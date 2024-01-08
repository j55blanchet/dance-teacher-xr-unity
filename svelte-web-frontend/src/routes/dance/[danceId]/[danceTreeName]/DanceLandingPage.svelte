<script lang="ts">
    import VideoWithSkeleton from '$lib/elements/VideoWithSkeleton.svelte';
	import LearningJourneyTrail from '$lib/elements/LearningJourneyTrailUI.svelte';
	import { getDanceVideoSrc, type Dance } from "$lib/data/dances-store";
    import type { SupabaseClient } from '@supabase/supabase-js';
	import { getContext } from 'svelte';
	import { danceVideoVolume } from '$lib/model/settings';
	import type { PracticePlan } from '$lib/model/PracticePlan';
    
    let supabase: SupabaseClient = getContext('supabase');

    export let dance: Dance;
    export let practicePlan: PracticePlan;

    let danceSrc: string;
    $: danceSrc = getDanceVideoSrc(supabase, dance);

    let videoWidth: number;
    let videoHeight: number;
    let videoCurrentTime: number;
    let videoPaused: boolean;

    function onSegmentClicked(e: any) {
        if (e?.detail?.start !== undefined) {
            videoCurrentTime = e.detail.start;
            videoPaused = false;
        }
    }
</script>

<section class="learning-dashboard p-5">
    
    <div class="preview-video-container"
        style:--aspect-ratio={videoWidth / videoHeight}>
        <div class="box p-0 video-wrapper">
            <VideoWithSkeleton 
                dance={dance}
                controls={{
                    showPlayPause: true,
                    showProgressBar: true,
                    enablePlayPause: true,
                    overrideStartTime: practicePlan.startTime,
                    overrideEndTime: practicePlan.endTime,
                    progressBarProps: {
                        enableSegmentClick: true,
                        startTime: practicePlan.startTime,
                        endTime: practicePlan.endTime,
                        breakpoints: practicePlan.demoSegmentation?.segmentBreaks ?? [],
                        labels: practicePlan.demoSegmentation?.segmentLabels ?? [],
                        classes: [],
                    }
                }}
                volume={$danceVideoVolume}
                bind:currentTime={videoCurrentTime}
                bind:paused={videoPaused}
                bind:videoWidth
                bind:videoHeight
                on:segmentClicked={onSegmentClicked}
                >
                <source src={danceSrc} type="video/mp4" />
            </VideoWithSkeleton>
        </div>
    </div>

    <div class="box learning-journey">
        <h3 class="is-size-4">Practice</h3>
        <LearningJourneyTrail {practicePlan} />
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
    grid-area: preview;
    overflow: hidden;
    max-height: calc(100%);
    align-self: center;
    justify-self: right;
    aspect-ratio: var(--aspect-ratio);
}

.video-wrapper {
    display: flex;
    max-height: 100%;
    overflow: hidden;
}

.learning-journey {
    grid-area: journey;
}
</style>
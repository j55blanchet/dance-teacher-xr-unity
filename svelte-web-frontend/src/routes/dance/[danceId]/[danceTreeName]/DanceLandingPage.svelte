<script lang="ts">
    import VideoWithSkeleton from '$lib/elements/VideoWithSkeleton.svelte';
	import LearningJourneyTrail from '$lib/elements/LearningJourneyTrailUI.svelte';
	import { getDanceVideoSrc, type Dance } from "$lib/data/dances-store";
    import type { SupabaseClient } from '@supabase/supabase-js';
	import { getContext, tick } from 'svelte';
	import { danceVideoVolume } from '$lib/model/settings';
	import type { PracticePlan, PracticePlanActivity } from '$lib/model/PracticePlan';
	import Icon from '@iconify/svelte';
	import { goto } from '$app/navigation';
    
    let supabase: SupabaseClient = getContext('supabase');

    export let dance: Dance;
    export let practicePlan: PracticePlan;

    let danceSrc: string;
    $: danceSrc = getDanceVideoSrc(supabase, dance);

    let videoElement: VideoWithSkeleton;
    let videoWidth: number;
    let videoHeight: number;
    let videoCurrentTime: number;
    let videoPaused: boolean;
    let segmentBreaks = [] as number[]
    $:  segmentBreaks = practicePlan.demoSegmentation?.segmentBreaks ?? [];
    let focusedSegmentIndex: number | undefined;
    let repeatEnabled = false;
    let segmentClasses = [] as string[][];

    $: {
        const segmentIndices = [...Array(segmentBreaks.length + 1).keys()];
        segmentClasses = segmentIndices.map(x => x === focusedSegmentIndex ? ['is-primary'] : []);
    }
    

    function toggleRepeatMode() {
        repeatEnabled = !repeatEnabled;
    }

    let lastClickedSegmentStartTime: number = -1;
    let lastClickedSegmentEndTime: number = 999999;

    function onSegmentClicked(e: any) {
        if (e?.detail?.start !== undefined) {
            focusedSegmentIndex = e.detail.index;
            lastClickedSegmentStartTime = e.detail.start;
            videoCurrentTime = lastClickedSegmentStartTime
            lastClickedSegmentEndTime = e.detail.end;
            videoPaused = false;
        }
    }


    async function startVideo(startTime?: number) {
        videoPaused = true;
        if (startTime !== undefined) {
            videoCurrentTime = startTime;
        }
        await new Promise(resolve => setTimeout(resolve, 100));

        await videoElement.play();
    }

    $: {
        if (focusedSegmentIndex !== undefined && videoCurrentTime >= lastClickedSegmentEndTime) {
            videoCurrentTime = lastClickedSegmentEndTime;
            videoPaused = true;
        } else if (!repeatEnabled && focusedSegmentIndex === undefined && videoCurrentTime >= practicePlan.endTime) {
            videoCurrentTime = practicePlan.endTime;
            videoPaused = true;
        }
    }

    $: {
        if (repeatEnabled && focusedSegmentIndex !== undefined && videoCurrentTime >= lastClickedSegmentEndTime) {
            startVideo(lastClickedSegmentStartTime);
        }  
        else if (repeatEnabled && focusedSegmentIndex === undefined && videoCurrentTime >= practicePlan.endTime) {
            startVideo(practicePlan.startTime);
        } 
    }

    function clearFocusedSegment() {
        focusedSegmentIndex = undefined;
        lastClickedSegmentEndTime = 999999;
        lastClickedSegmentStartTime = -1;
    }

    function onSkipBackClicked(e: Event) {
        clearFocusedSegment();
    }

    function onPlayPauseClicked(e: Event) {
        if (videoPaused && focusedSegmentIndex !== undefined && videoCurrentTime >= lastClickedSegmentEndTime) {
            clearFocusedSegment();
            if (videoCurrentTime >= practicePlan.endTime) {
                videoCurrentTime = practicePlan.startTime;
            }
            videoPaused = false;
            e.preventDefault();
            
        }  else if (videoPaused && videoCurrentTime >= practicePlan.endTime) {
            videoCurrentTime = practicePlan.startTime;
            videoPaused = false;
            e.preventDefault();
        }   
    }

    function onLearningActivityClicked(activity: PracticePlanActivity) {
        if (activity.type === 'segment') {
            goto(`${encodeURIComponent(activity.id)}/0/`)
        }
    }

</script>

<section class="learning-dashboard p-5">
    
    <div class="preview-video-container"
        style:--aspect-ratio={videoWidth / videoHeight}>
        <div class="box p-0 video-wrapper">
            <VideoWithSkeleton 
                bind:this={videoElement}
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
                        breakpoints: segmentBreaks,
                        labels: practicePlan.demoSegmentation?.segmentLabels ?? [],
                        classes: segmentClasses,
                    }
                }}
                volume={$danceVideoVolume}
                bind:currentTime={videoCurrentTime}
                bind:paused={videoPaused}
                bind:videoWidth
                bind:videoHeight
                on:segmentClicked={onSegmentClicked}
                on:skipBackClicked={onSkipBackClicked}
                on:playPauseClicked={onPlayPauseClicked}
                >
                <source src={danceSrc} type="video/mp4" />
                <span slot="extra-control-buttons">
                    <button class="button" on:click={toggleRepeatMode}>
                        <span class="icon">
                            <!-- <Icon icon="ic:round-repeat-one" /> -->
                            {#if !repeatEnabled}
                                <Icon icon="pepicons-pop:repeat-off" />
                            {:else if focusedSegmentIndex !== undefined}
                                <Icon icon="f7:repeat-1" />
                            {:else}
                                <Icon icon="f7:repeat" />
                            {/if}
                        </span>
                    </button>
                    <!-- <span>
                        {lastClickedSegmentStartTime.toFixed(1)}-{videoCurrentTime.toFixed(1)}
                    </span> -->
                </span>
            </VideoWithSkeleton>
        </div>
    </div>

    <div class="box learning-journey">
        <h3 class="is-size-4">Practice</h3>
        <LearningJourneyTrail 
            {practicePlan}
            on:activityClicked={(e) => onLearningActivityClicked(e.detail)}/>
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
<script lang="ts">
	import type { SegmentedProgressBarPropsWithoutCurrentTime } from '$lib/elements/SegmentedProgressBar.svelte';
    import { navbarProps } from "$lib/elements/NavBar.svelte";
	import PracticePage from "$lib/pages/PracticePage.svelte";
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { getContext } from 'svelte';
	import { save_activitystep_progress } from '$lib/data/activity-progress.js';
	import { goto, invalidate } from '$app/navigation';

    export let data;
    let supabase: SupabaseClient = getContext('supabase');

    let parentUrl: string;
    $: {
        parentUrl = '/dance/' + encodeURIComponent(data.dance.clipRelativeStem) + '/' + encodeURIComponent(data.danceTree.tree_name) + '/';

        navbarProps.update(props => ({
            ...props,
            collapsed: false,
            pageTitle: data.practiceActivity.title,
            subtitle:  data.practiceStep.title,
            back: {
                url: parentUrl,
                title: `${data.dance.title} Home`,
            },
        }));
    }

    let segmentBreaks: number[];
    $: {
        segmentBreaks = data.practicePlan.demoSegmentation?.segmentBreaks ?? [];
    }
    let segmentIsolateIndex = undefined as undefined | number;

    $: if (data.practiceActivity.type === "segment") {
        segmentIsolateIndex = data.practiceActivity.segmentIndex;
    }

    let progressBarProps: SegmentedProgressBarPropsWithoutCurrentTime;
    $: progressBarProps = {
        startTime: data.practicePlan.startTime,
        endTime: data.practicePlan.endTime,
        breakpoints: data.practicePlan.demoSegmentation?.segmentBreaks ?? [],
        labels: data.practicePlan.demoSegmentation?.segmentLabels ?? [],
        enableSegmentClick: true,
        isolateSegmentIndex: segmentIsolateIndex,
    };

function onStepCompleted() {
    
    save_activitystep_progress(
        supabase,
        data.dance.clipRelativeStem,
        data.practicePlan.id,
        data.practiceActivity.id,
        data.practiceStep.id, 
        { completed: true }
    );

    // invalidate('progress:' + data.dance.clipRelativeStem);
    
    const queryString = '?completedStep=' + encodeURIComponent(data.practiceActivity.id) + '/' + encodeURIComponent(data.practiceStep.id); 
    console.log('goto', parentUrl + queryString);
    goto(parentUrl + queryString, { invalidateAll: true });
    // );
}
</script>

<div class="p-4 overflow-hidden">
    <PracticePage 
        dance={data.dance}    
        practiceStep={data.practiceStep}
        pageActive={true}
        progressBarProps={progressBarProps}
        on:stepCompleted={onStepCompleted}
    />
</div>

<style>
    div {
        height: var(--content_height);
        width: 100%;
        overflow: hidden;
    }
</style>
<script lang="ts">
	import type { SegmentedProgressBarPropsWithoutCurrentTime } from '$lib/elements/SegmentedProgressBar.svelte';
    import { navbarProps } from "$lib/elements/NavBar.svelte";
	import PracticePage from "$lib/pages/PracticePage.svelte";
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { getContext } from 'svelte';
	import { save_activitystep_progress } from '$lib/data/activity-progress.js';
	import { goto, invalidate } from '$app/navigation';
	import type PracticeStep from '$lib/model/PracticeStep.js';
	import type { PracticePlanActivity } from '$lib/model/PracticePlan';

    export let data;

    let practicePage: PracticePage | undefined;
    let practiceActivity: PracticePlanActivity;
    $: practiceActivity = data.practiceActivity;

    let supabase: SupabaseClient = getContext('supabase');

    let parentUrl: string;
    let activityBaseUrl: string;
    $: {
        parentUrl = '/dance/' + encodeURIComponent(data.dance.clipRelativeStem) + '/' + encodeURIComponent(data.danceTree.tree_name) + '/';
        activityBaseUrl = parentUrl + encodeURIComponent(data.practiceActivity.id) + '/';

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

    let currentStepIndex: number;
    $: currentStepIndex = practiceActivity.steps.findIndex(step => step.id === data.practiceStep.id);

    let nextStep: PracticeStep | undefined;
    $: nextStep = practiceActivity.steps[currentStepIndex + 1]

    async function onNextClicked() {

        // save progress
        save_activitystep_progress(
            supabase,
            data.dance.clipRelativeStem,
            data.practicePlan.id,
            data.practiceActivity.id,
            data.practiceStep.id, 
            { completed: true }
        );

        // invalidate('progress:' + data.dance.clipRelativeStem);
        
        if (nextStep) {
            const url = activityBaseUrl + encodeURIComponent(nextStep.id) + "/";
            goto(url, { invalidateAll: true });
            return;
        }

        const queryString = '?completedStep=' + encodeURIComponent(data.practiceActivity.id) + '/' + encodeURIComponent(data.practiceStep.id); 
        console.log('goto', parentUrl + queryString);
        await goto(parentUrl + queryString, { invalidateAll: true });
        practicePage?.reset();
        // );
    }
</script>

<div class="p-4 overflow-hidden">
    <PracticePage 
        bind:this={practicePage}
        dance={data.dance}    
        practiceStep={data.practiceStep}
        pageActive={true}
        progressBarProps={progressBarProps}
        on:nextClicked={onNextClicked}
        continueBtnTitle={nextStep ? nextStep.title : "Finish"}
        continueBtnIcon={nextStep ? "nextarrow" : "check"}
    />
</div>

<style>
    div {
        height: var(--content_height);
        width: 100%;
        overflow: hidden;
    }
</style>
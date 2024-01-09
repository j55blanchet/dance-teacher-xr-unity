<script lang="ts">
	import type { SegmentedProgressBarPropsWithoutCurrentTime } from '$lib/elements/SegmentedProgressBar.svelte';
    import { navbarProps } from "$lib/elements/NavBar.svelte";
	import PracticePage from "$lib/pages/PracticePage.svelte";

    export let data;

    $: {
        navbarProps.update(props => ({
            ...props,
            collapsed: false,
            pageTitle: data.practiceActivity.title,
            subtitle:  data.practiceStep.title,
            back: {
                url: '/dance/' + encodeURIComponent(data.dance.clipRelativeStem) + '/' + encodeURIComponent(data.danceTree.tree_name) + '/',
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
    let segmentClasses = [] as string[][];
    $: {
        const segmentIndices = [...Array(segmentBreaks.length + 1).keys()];
        segmentClasses = segmentIndices.map(x => x === segmentIsolateIndex ? ['is-primary'] : []);
    }

    let progressBarProps: SegmentedProgressBarPropsWithoutCurrentTime;
    $: progressBarProps = {
        startTime: data.practiceStep.startTime,
        endTime: data.practiceStep.endTime,
        breakpoints: data.practicePlan.demoSegmentation?.segmentBreaks ?? [],
        labels: data.practicePlan.demoSegmentation?.segmentLabels ?? [],
        classes: segmentClasses,
        enableSegmentClick: true,
        isolateSegmentIndex: segmentIsolateIndex,
    };

</script>

<div class="p-4 overflow-hidden">
    <PracticePage 
        dance={data.dance}    
        practiceStep={data.practiceStep}
        pageActive={true}
        progressBarProps={progressBarProps}
    />
</div>

<style>
    div {
        height: var(--content_height);
        width: 100%;
        overflow: hidden;
    }
</style>
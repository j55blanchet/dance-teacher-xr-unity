
<script lang="ts" context="module">
    export type SegmentedProgressBarProps = {
        startTime: number,
        endTime: number,
        currentTime: number,
        breakpoints: number[],
        labels: string[],
        classes: string[][],
    }
</script>
<script lang="ts">
	export let startTime = 0;
    export let endTime = 1;
    export let currentTime = 0;
    export let breakpoints: number[] = [];
    export let labels: string[] = [];
    export let classes: string[][] = [];

    let segments = [] as { start: number, end: number, duration: number, label?: string, classes: string[] }[];
    $: {
        segments = [];
        let start = startTime;
        let i = 0;
        while((breakpoints.length + 1) > i) {
            let end = breakpoints.length > i ? breakpoints[i] : endTime;
            segments.push({
                start: start,
                end: end,
                duration: end - start,
                label: labels[i],
                classes: classes[i] ?? [],
            });
            start = end;
            i += 1;
        }
    }
</script>

<div class="segmented-progress-bar">
    {#each segments as segment}
        <progress 
            class={["progress", ...segment.classes].join(" ")}
            value={Math.max(0, Math.min(segment.duration, currentTime - segment.start))} 
            max={segment.duration} 
            style="--segment_time: {segment.duration}">
            {#if segment.label}
                <span class="label">{segment.label}</span>
            {/if}
        </progress>
    {/each}
</div>


<style lang="scss">
    .segmented-progress-bar {
        display: flex;
        flex-direction: row;
        width: 100%;
        position: relative;
        
        > .progress {
            flex-basis: 0; 
            flex-grow: var(--segment_time);
        }
    }
</style>
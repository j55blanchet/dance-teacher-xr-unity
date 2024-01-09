
<script lang="ts" context="module">
    export type SegmentedProgressBarProps = {
        startTime: number,
        endTime: number,
        currentTime: number,
        breakpoints: number[],
        labels: string[],
        classes: string[][],
        enableSegmentClick: boolean[] | boolean,
        isolateSegmentIndex: number | undefined,
    }
    export type SegmentedProgressBarPropsWithoutCurrentTime = Omit<SegmentedProgressBarProps, 'currentTime'>;
</script>
<script lang="ts">
	import { createEventDispatcher } from "svelte";

	export let startTime = 0;
    export let endTime = 1;
    export let currentTime: number;
    export let breakpoints: number[] = [];
    export let labels: string[] = [];
    export let classes: string[][] = [];
    export let enableSegmentClick: boolean[] | boolean = false;
    export let isolateSegmentIndex: number | undefined;

    const dispatch = createEventDispatcher();
    
    let segments = [] as { index: number, start: number, end: number, duration: number, label?: string, classes: string[] }[];
    $: {
        segments = [];
        let start = startTime;
        let i = 0;
        while((breakpoints.length + 1) > i) {
            let end = breakpoints.length > i ? breakpoints[i] : endTime;
            segments.push({
                index: i,
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
    {#each segments as segment, i}
        <button 
            class={["progressbutton button is-rounded is-small", ...segment.classes].join(" ")}
            class:clickable={enableSegmentClick === true || (Array.isArray(enableSegmentClick) && enableSegmentClick[i])}
            on:click={() => {
                if (enableSegmentClick === true || (Array.isArray(enableSegmentClick) && enableSegmentClick[i])) {
                    dispatch('segmentClicked', segment);
                }
            }}
            style:--segment-time={segment.duration}
            style:--percent-progress={
                isolateSegmentIndex !== undefined && isolateSegmentIndex !== segment.index ? 0 :
                (Math.max(0, Math.min(segment.duration, currentTime - segment.start)))
                 / segment.duration
            }
            >
            <span class="progress-container absolute inset-2 rounded-full overflow-hidden inset-2">
                <span class="progress"></span>
            </span>
            
            {#if segment.label}
            <div class="is-overlay is-flex is-flex-direction-column is-align-items-center is-justify-content-center">
                <span class="label tag is-white m-0 is-small">{segment.label}</span>
            </div>
            {/if}
        </button>
    {/each}
</div>
<!-- <div style="background: white">
    {currentTime.toFixed(2)}s
</div> -->


<style lang="scss">
    .segmented-progress-bar {
        display: flex;
        flex-direction: row;
        width: 100%;
        position: relative;
        
        > .progressbutton {
            // border: none;
            flex-basis: 0; 
            flex-grow: var(--segment-time);
            margin: 0;
            overflow: hidden;

            &.clickable {
                cursor: pointer;
            }

            & .progress {
                right: auto;
                height: 100%;
                background: rgba(0,0,0,0.2);
                width: calc(100% * var(--percent-progress));
            }
        }
    }
</style>

<script lang="ts" context="module">
    export type SegmentedProgressBarProps = {
        startTime: number,
        endTime: number,
        currentTime: number,
        breakpoints: number[],
        labels: string[],
        classes: string[][],
        enableSegmentClick: boolean[] | boolean,
    }
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

    const dispatch = createEventDispatcher();
    
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
            style:--percent-progress={(Math.max(0, Math.min(segment.duration, currentTime - segment.start)))
                 / segment.duration
            }
            >
            {#if segment.label}
                <span class="label tag m-0">{segment.label}</span>
            {/if}
            <span class="progress is-overlay"></span>
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

            &.clickable {
                cursor: pointer;
            }

            & .progress {
                right: auto;
                height: 100%;
                background: rgba(0,0,0,0.1);
                width: calc(100% * var(--percent-progress));
            }
        }
    }
</style>
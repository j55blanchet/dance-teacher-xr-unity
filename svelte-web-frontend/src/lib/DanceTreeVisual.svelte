<script lang="ts">
import { debugMode } from './model/settings';
import { createEventDispatcher } from 'svelte';
import type { DanceTreeNode } from '$lib/data/dances-store';

export let enableClick: boolean = false;
export let currentTime: number = 0;
export let node: DanceTreeNode;

export let showProgressNodes: Array<DanceTreeNode> = [];
export let beatTimes: Array<number> = [];

let progressPercent = 0;
$: progressPercent = (currentTime - node.start_time) / (node.end_time - node.start_time);
$: node_title = node.id.split("-").findLast(() => true);

let showProgress = false;
$: showProgress = showProgressNodes.includes(node);

const dispatch = createEventDispatcher();

function barClicked () {
    if (enableClick) {
        dispatch('nodeClicked', node);
    }
}
</script>

<div class="node" style="--node-duration:{node.end_time - node.start_time}">
    <a class="bar outlined" 
       class:button={enableClick} 
       class:active={showProgress}
       on:click={barClicked}
       role="menuitem"
       tabindex="0"
    >   
        {#if showProgress}<span class="progress outlined" style="width:{progressPercent*100}%">
            <!-- {currentTime.toFixed(1)} -->
        </span>{/if}

        {#if $debugMode}
            {#each beatTimes as beatTime}
                {#if beatTime > node.start_time && beatTime < node.end_time}
                    <span class="beat-line" style="left:{(beatTime - node.start_time)/(node.end_time - node.start_time)*100}%">
                    </span>
                {/if}
            {/each}
        {/if}
        {#if $debugMode}
        <span class="complexity">
            {(node.complexity / (node.end_time - node.start_time)).toFixed(2)}/s ({node.complexity.toFixed(2)} total)
        </span>
        {/if}
    </a>
    {#if node.children.length > 0}
        <div class="children">
        {#each node.children as child}
            <svelte:self 
                node={child} 
                {enableClick} 
                {currentTime}
                {showProgressNodes}
                {beatTimes}
                on:nodeClicked 
                />
        {/each}
        </div>
    {/if}
</div>

<style lang="scss">
    .bar {
        position: relative;
        // min-width: 100%;
        text-align: center;
        height: 1em;
        border-width: 0.12em;
        padding: 0;
        overflow: hidden;
    }

    .bar.active {
        // border-width: 0.12em;
        box-shadow: 0 0 1px black;
        border: 0 solid transparent;
    }

    .bar .progress {
        display: block;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.3);
        border-width: 0.12em;
    }

    .complexity {
        position: absolute;
        left: 0;
        right: 0;
        font-size: 0.9rem;
        top: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .beat-line {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 2px;
        background: lightskyblue;
        border: none;
    }

    // .bar.clickable {
    //     cursor: pointer;
    // }

    .children {
        display: flex;
        flex-direction: row;
        width: 100%;
        justify-content: space-between;
        gap: 0.5em;
    }

    .node {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.25em;
        flex-basis: 0;
        flex-grow: var(--node-duration);
        // width: 100%;
        // margin: 1em;
        // border: 1px solid black;
        // border-radius: 1em;
    }
</style>
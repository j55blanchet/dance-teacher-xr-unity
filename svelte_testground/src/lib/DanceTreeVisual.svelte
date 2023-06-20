<script lang="ts">

import { createEventDispatcher } from 'svelte';
import type { DanceTreeNode } from '$lib/dances-store';

export let enableClick: boolean = false;
export let node: DanceTreeNode;
$: node_title = node.id.split("-").findLast(() => true);

const dispatch = createEventDispatcher();

function barClicked (e) {
    if (enableClick) {
        dispatch('nodeClicked', node);
    }
}
</script>

<div class="node" style="--node-duration:{node.end_time - node.start_time}">
    <a class="bar outlined" class:button={enableClick} on:click={barClicked}></a>
    {#if node.children.length > 0}
        <div class="children">
        {#each node.children as child}
            <svelte:self node={child} {enableClick} on:nodeClicked />
        {/each}
        </div>
    {/if}
</div>

<style lang="scss">
    .bar {
        // min-width: 100%;
        text-align: center;
        height: 1em;
        border-width: 0.12em;
        padding: 0;
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
        justify-content: center;
        gap: 0.25em;
        flex-basis: 0;
        flex-grow: var(--node-duration);
        // width: 100%;
        // margin: 1em;
        // border: 1px solid black;
        // border-radius: 1em;
    }
</style>
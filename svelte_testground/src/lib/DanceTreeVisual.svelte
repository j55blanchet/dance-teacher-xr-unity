<script lang="ts">

import type { DanceTreeNode } from '$lib/dances-store';

export let node: DanceTreeNode;

$: node_title = node.id.split("-").findLast(() => true);
</script>

<div class="node" style="--node-duration:{node.end_time - node.start_time}">
    <div class="bar outlined thin">{node_title}</div>
    {#if node.children.length > 0}
        <div class="children">
        {#each node.children as child}
            <svelte:self node={child} />
        {/each}
        </div>
    {/if}
</div>

<style lang="scss">
    .bar {
        width: 100%;
        text-align: center;
    }
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
        align-items: center;
        justify-content: center;
        gap: 0.25em;
        flex-basis: 0;
        flex-grow: var(--node-duration);
        width: 100%;
        // margin: 1em;
        // border: 1px solid black;
        // border-radius: 1em;
    }
</style>
<script lang="ts" context="module">
export type NodeHighlight = {
    color?: string,
    label?: string,
    pulse?: boolean,
    borderColor?: string,
}
</script>
<script lang="ts">
import { debugMode, summaryFeedback_skeleton3d_goodPerformanceThreshold, summaryFeedback_skeleton3d_mediumPerformanceThreshold } from '$lib/model/settings';
import { createEventDispatcher } from 'svelte';
import { findDanceTreeNode, type DanceTreeNode, findDanceTreeSubNode, type DanceTree } from '$lib/data/dances-store';

import frontendPerformanceHistory from '$lib/ai/frontendPerformanceHistory';
import { derived } from 'svelte/store';

export let enableClick: boolean = false;
export let currentTime: number = 0;
export let danceTree: DanceTree | undefined = undefined;
export let node: DanceTreeNode;
export let playingFocusMode: 'hide-others' | 'hide-non-descendant' | 'show-all' = 'show-all';
export let enableColorCoding: false | true | 'yesExceptCurrentNode' = false;

export let nodeHighlights: Record<string, NodeHighlight> = {};
let highlight: NodeHighlight | undefined = undefined;
$: highlight = nodeHighlights[node.id];

export let showProgressNode: DanceTreeNode | undefined;
export let beatTimes: Array<number> = [];

let enableThisNodeColorCoding = false;
$: {
    if (enableColorCoding === true) {
        enableThisNodeColorCoding = true;
    } else if (enableColorCoding === 'yesExceptCurrentNode' && node.id !== showProgressNode?.id) {
        enableThisNodeColorCoding = true;
    } else {
        enableThisNodeColorCoding = false;
    }
}

let progressPercent = 0;
$: progressPercent = (currentTime - node.start_time) / (node.end_time - node.start_time);
$: node_title = node.id.split("-").findLast(() => true);

let showProgress = false;
$: showProgress = (showProgressNode != undefined) && node === showProgressNode;

let nodePerformanceHistory = frontendPerformanceHistory.getDanceSegmentPerformanceHistory(
    danceTree?.clip_relativepath ?? "",
    "skeleton3DAngleSimilarity",
    node?.id
)
$: nodePerformanceHistory = frontendPerformanceHistory.getDanceSegmentPerformanceHistory(
    danceTree?.clip_relativepath ?? "",
    "skeleton3DAngleSimilarity",
    node?.id
)

const bestScore = derived(nodePerformanceHistory, ($nodePerformanceHistory) => {
    const bestFoundScore = $nodePerformanceHistory.reduce((best, current) => {
        const curScore = current.summary?.overall ?? -Infinity;
        if (curScore > best.score) {
            return {
                score: curScore,
                date: current.date
            };
        } else {
            return best;
        }
    }, { score: -Infinity, date: new Date()});
    if (bestFoundScore.score === -Infinity) {
        return undefined;
    } else {
        return bestFoundScore;
    }
})

function shouldHideBar(a_node: DanceTreeNode, progressNode: DanceTreeNode | undefined, focusMode: typeof playingFocusMode) {
    if (focusMode === 'hide-others') {
        return progressNode !== undefined
            && a_node !== progressNode;
    } else if (focusMode === 'hide-non-descendant') {
        return progressNode !== undefined
            && a_node.id !== (progressNode.id) 
            && !findDanceTreeSubNode(progressNode, a_node.id);
    } else {
        return false;
    }
}

function getHasNodeInSubtree(a_node: DanceTreeNode, progressNode: DanceTreeNode | undefined) {
    return progressNode !== undefined
        && findDanceTreeSubNode(a_node, progressNode.id) !== null;
}

function shouldHideAllChildrenNodes(parentNode: DanceTreeNode, progressNode: DanceTreeNode | undefined, focusMode: typeof playingFocusMode) {
    // const isFocusNode = progressNode !== undefined && parentNode.id === progressNode.id;
    // const hasFocusNodeInSubtree = progressNode && findDanceTreeSubNode(parentNode, progressNode.id);
    // const isAChildOfFocusNode = progressNode && findDanceTreeSubNode(progressNode, parentNode.id);
    // if (focusMode === 'hide-others') {
    //     // Can hide all of this node's children if the progress node is not a descendant of this node.
    //     return progressNode !== undefined && (isFocusNode || !hasFocusNodeInSubtree);
    // } else if (focusMode === 'hide-non-descendant') {
    //     return progressNode !== undefined && 
    //         !isFocusNode && 
    //         !hasFocusNodeInSubtree &&                                   
    //         !isAChildOfFocusNode;
    // }

    return false;
}

let isBarHidden = false;
$: {
    isBarHidden = shouldHideBar(node, showProgressNode, playingFocusMode);
}
let areAllChildrenHidden = false;
$: {
    areAllChildrenHidden = shouldHideAllChildrenNodes(node, showProgressNode, playingFocusMode);
}
let isNodeHidden = false;
$: {
    isNodeHidden = isBarHidden && areAllChildrenHidden;
}
let hasNodeInSubtree = false;
$: {
    hasNodeInSubtree = getHasNodeInSubtree(node, showProgressNode);
}

let nodeTitleString = "";
$: {
    if (!$debugMode) nodeTitleString = "";
    else {
        const duration = node.end_time - node.start_time;
        const complexityPerSecond = node.complexity / (node.end_time - node.start_time);
        const nodeComplexityString = `${complexityPerSecond.toFixed(2)}/s ${node.complexity.toFixed(2)} total`
        const highlightStr = highlight !== undefined ? `\nhighlight: ${JSON.stringify(highlight)}` : "";
        nodeTitleString = `${node.id}\nComplexity: ${nodeComplexityString}\nDuration: ${duration.toFixed(2)}s${highlightStr}`;
    } 
}
const dispatch = createEventDispatcher();

function barClicked () {
    if (enableClick) {
        dispatch('nodeClicked', node);
    }
}
</script>

<div class="node" 
    style="--node-duration:{node.end_time - node.start_time}"
    class:hidden={isNodeHidden}
    class:hasNodeInSubtree={hasNodeInSubtree}
    class:hiddenBar={isBarHidden}
    class:labeled={highlight?.label !== undefined}>

    <a class="bar outlined" 
       class:hidden={isBarHidden}
       
       class:active={showProgress}
       class:hasScore={enableThisNodeColorCoding && $bestScore !== undefined}
       class:hasGoodScore={enableThisNodeColorCoding && $bestScore !== undefined && $bestScore.score > $summaryFeedback_skeleton3d_goodPerformanceThreshold}
       class:hasMediumScore={enableThisNodeColorCoding && $bestScore !== undefined && $bestScore.score > $summaryFeedback_skeleton3d_mediumPerformanceThreshold && $bestScore.score <= $summaryFeedback_skeleton3d_goodPerformanceThreshold}
       class:hasBadScore={enableThisNodeColorCoding && $bestScore !== undefined && $bestScore.score <= $summaryFeedback_skeleton3d_mediumPerformanceThreshold}
       class:highlighted={highlight !== undefined}
       class:highlighted-pulse={highlight?.pulse ?? false}
       class:highlighted-colorborder={highlight?.borderColor !== undefined}
       class:labeled={highlight?.label !== undefined}
       style:--highlight-color={highlight?.color ?? 'var(--color-theme-1'}
       style:--custom-border-color={highlight?.borderColor ?? 'var(--color-text)'}
       on:click={barClicked}
       role="menuitem"
       tabindex="0"
       title={nodeTitleString}
    >   
        {#if showProgress}<span class="progress" style="width:{Math.min(progressPercent, 1.0)*100}%">
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
        
        {#if highlight?.label !== undefined}
        <span class="label">{highlight?.label}</span>
        {:else if $debugMode && node_title !== undefined}
        <span class="label">
            {node_title}
        </span>
        {/if}
    </a>

    {#if node.children.length > 0}
        <div class="children" class:hidden={areAllChildrenHidden}>
        {#each node.children as child}
            <svelte:self 
                node={child} 
                {enableClick} 
                {currentTime}
                showProgressNode={showProgressNode}
                {beatTimes}
                {playingFocusMode}
                {danceTree}
                {nodeHighlights}
                {enableColorCoding}
                on:nodeClicked 
                />
        {/each}
        </div>
    {/if}
</div>

<style lang="scss">

.node {
    --hide-transition-duration: 0.75s;
    --highlight-color: #eaff00;    
    box-sizing: border-box;
}
    
    .bar {
        background: lightgray;
        box-sizing: border-box;
        position: relative;
        // min-width: 100%;
        text-align: center;
        min-height: 1.25em;
        transition: height var(--height-transition-duration, --hide-transition-duration) ease-in-out, width var(--hide-transition-duration) ease-in-out, padding var(--hide-transition-duration) ease-in-out, opacity var(--hide-transition-duration) ease-in-out, background-color var(--hide-transition-duration) ease-in-out;
        border-width: 0.12em;
        padding: 0;
        // overflow: hidden;    
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--std-border-radius);
    }

    .bar.highlighted {
        // border-color: var(--highlight-color);
        // border-width: calc(0.12em * var(--border-scale));
        min-height: 1.5em;
        padding: 0.25em;
        box-shadow: 0 0 0.1em 0.1em var(--highlight-color), inset 0 0 0.075em 0.075em var(--highlight-color);
    }

    .bar.highlighted.highlighted-pulse {
        animation-name: highlightPulse;
        animation-duration: 0.5s;
        animation-iteration-count: infinite;
        animation-direction: alternate;
    }

    .bar.highlighted-colorborder {
        border-color: var(--custom-border-color);
    }
    // .bar .label {
    //     // color: var(--highlight-color);
    // }

    .bar.hasScore {
        background: gray;
    }
    .bar.hasGoodScore {
        background: hsl(120, 55%, 83%);
    }
    .bar.hasMediumScore {
        background: hsl(61, 69%, 83%);
    }
    .bar.hasBadScore {
        background: hsl(0, 58%, 83%);
    }

    .bar.active {
        // border-width: 0.12em;
        box-shadow: 1px 1px 2px 2px var(--color-theme-1);
        // border: 0 solid transparent;
    }
    .bar.hidden {
        box-shadow: 0;
        // border: 0;
        min-height: 0.5em;
        opacity: 0.2;
    }

    .bar .progress {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        height: 100%;
        border-radius: 0;
        display: block;
        background-color: rgba(0, 0, 0, 0.3);
        border-width: 0.12em;
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
        transition: gap var(--hide-transition-duration) ease-in-out;
    }
    .children.hidden {
        gap: 0;
    }

    .node {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.25em;
        flex-basis: 0;
        flex-grow: var(--node-duration);
        transition: flex-grow var(--hide-transition-duration) ease-in-out, flex-basis var(--hide-transition-duration) ease-in-out;
    }

    .node.labeled {
        flex-basis: min-content;
    }

    .node.hiddenBar {
        // flex-basis: 0;
        flex-grow:  calc(var(--node-duration) / 2);
    }

    .node.hiddenBar.hasNodeInSubtree {
        flex-grow: var(--node-duration);
    }
</style>
<script lang="ts">
import { goto } from '$app/navigation';
import { page, navigating } from '$app/stores'
import { navbarProps } from '$lib/elements/NavBar.svelte';

import SketchButton from '$lib/elements/SketchButton.svelte';
import { getDanceVideoSrc, type Dance, type DanceTree, type DanceTreeNode } from '$lib/data/dances-store';
import DanceTreeVisual from '$lib/elements/DanceTreeVisual.svelte';
import { tick } from 'svelte';

import VideoWithSkeleton from '$lib/elements/VideoWithSkeleton.svelte';
import { debugMode } from '$lib/model/settings';
import ProgressEllipses from '$lib/elements/ProgressEllipses.svelte';

export let dance: Dance;
export let danceTree: DanceTree;

// Pin the video small, so the flexbox system can auto-size the height
let fitVideoToFlexbox = true;

let danceSrc: string = '';
$: {
    danceSrc = getDanceVideoSrc(dance);
}
let danceBeatTimes: number[] = [];

$: danceBeatTimes = dance?.all_beat_times ?? [];
let videoPaused: boolean = true;
let stopTime: number = Infinity;
let videoCurrentTime: number = 0;
let videoPlaybackSpeed: number = 1;
let currentPlayingNode: DanceTreeNode | null = null;
let showProgressNodes: Array<DanceTreeNode> = [];

let videoDuration: number;

$: navbarProps.set({
    collapsed: false,
    pageTitle: dance.title,
    back: {
        url: '/',
        title: 'Home',
    },
});

$: if (videoCurrentTime > stopTime) {
    videoPaused = true;
}

$: {
    navbarProps.update(props => ({
        ...props,
        pageTitle: dance.title,
        backPageUrl: '/',
        backPageTitle: 'Home',
    }));
}

async function onNodeClicked(e: any) {
    console.log('node clicked', e.detail);

    const selectedTreeNode = e.detail as DanceTreeNode;
    videoPaused = true;
    stopTime = selectedTreeNode.end_time;
    currentPlayingNode = selectedTreeNode;
    await tick();
    videoCurrentTime = selectedTreeNode.start_time;
    await tick();
    videoPaused = false;
    // videoElement.play();
}

function showProgress(node: DanceTreeNode) {
    return node === currentPlayingNode;
}

async function practiceClicked() {
    try {
        if (!currentPlayingNode) throw new Error('No node selected');

        // @ts-ignore
        const curPath: string = $page?.path ?? "";
        const url = curPath + "practicenode/" + currentPlayingNode.id;
        await goto(url);
    } 
    catch(e) {
        console.error("Error navigating to practice page", e);
    }
}

</script>

<svelte:head>
	<title>Dance | {dance.title}</title>
	<meta name="description" content="App for learning the dance: {dance.title}" />
</svelte:head>

<section class:nodeSelected={currentPlayingNode ?? false }>
    <div class="visual-tree">
        <div>
            <DanceTreeVisual 
                on:nodeClicked={onNodeClicked} 
                enableClick 
                node={danceTree.root}
                danceTree={danceTree}
                showProgressNode={currentPlayingNode ?? undefined}
                currentTime={videoCurrentTime}
                beatTimes={danceBeatTimes}
            /> 
        </div>
    </div>
    
    
    <div class="ta-center">
        {#if currentPlayingNode}
            {#if $debugMode}
            <span>{currentPlayingNode.id}</span>
            {/if}
            <SketchButton on:click={practiceClicked} disabled={$navigating !== null}>
                {#if $navigating}
                    Navigating<ProgressEllipses />
                {:else}
                    Practice
                {/if}
            </SketchButton>
        {:else}
            <span>Select a node to practice</span>
        {/if}
    </div>
    
    
    <div class="preview">
       
        <VideoWithSkeleton bind:currentTime={videoCurrentTime}
            bind:playbackRate={videoPlaybackSpeed}
            bind:duration={videoDuration}
            bind:paused={videoPaused}
            bind:fitToFlexbox={fitVideoToFlexbox}
            drawSkeleton={false}
            >
            <source src={danceSrc} type="video/mp4" />
        </VideoWithSkeleton>
        {#if $debugMode}
        <div class="controls">
            <div class="control">
                <span><label for="playbackSpeed">Playback Speed</label>:&nbsp;{videoPlaybackSpeed.toFixed(1)}x</span>
                <input type="range" name="playbackSpeed" bind:value={videoPlaybackSpeed} min="0.5" max="2" step="0.1" />
            </div>
        </div>
        {/if}
    </div>
</section>


<style lang="scss">
section {
    position: relative;
    width: 100vw;
    height: var(--content_height);
    box-sizing: border-box;
    display: grid;
    overflow: hidden;
    grid-template-rows: auto auto minmax(0, 1fr); 
    gap: 1rem;
}

.preview {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: stretch;
    overflow: hidden;
    padding-bottom: 1rem;
}

.visual-tree {
    max-width: 100vw;
    margin: 1rem;
    margin-bottom: 0;
}
.visual-tree div {
    display: flex;
    overflow-x: auto;
}

// div:has(.practiceLink) {
    // margin-bottom: 1rem;
// }

.control {
    display: flex;
    flex-direction: column; 
    align-items: center;
    justify-content: center;
}
</style>

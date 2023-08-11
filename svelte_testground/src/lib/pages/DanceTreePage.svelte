<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/stores'

import SketchButton from '$lib/elements/SketchButton.svelte';
import type { DanceTree, Dance, DanceTreeNode } from '$lib/dances-store';
import { getDanceVideoSrc } from '$lib/dances-store';
import DanceTreeVisual from '$lib/DanceTreeVisual.svelte';
import { tick } from 'svelte';

import VideoWithSkeleton from '$lib/elements/VideoWithSkeleton.svelte';


export let dance: Dance;
export let danceTree: DanceTree;

// Pin the video small, so the flexbox system can auto-size the height
let fitVideoToFlexbox = true;

let danceSrc: string = '';
$: {
    danceSrc = getDanceVideoSrc(dance);
}

let videoPaused: boolean = true;
let stopTime: number = Infinity;
let videoCurrentTime: number = 0;
let videoPlaybackSpeed: number = 1;
let currentPlayingNode: DanceTreeNode | null = null;
let showProgressNodes: Array<DanceTreeNode> = [];

let videoDuration: number;

$: {
    showProgressNodes = currentPlayingNode !== null ? 
        [currentPlayingNode]:
        [];
}
$: if (videoCurrentTime > stopTime) {
    videoPaused = true;
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

<section>
    <nav>
        <a class="button" href="/">&lt; Home</a>
        <h1 class="title">
            {dance.title}
        </h1>
        <div>
        </div>
    </nav>
    <div class="visual-tree">
        <div>
            <DanceTreeVisual 
                on:nodeClicked={onNodeClicked} 
                enableClick 
                node={danceTree.root}
                showProgressNodes={showProgressNodes}
                currentTime={videoCurrentTime}
                beatTimes={dance.beatTimes || []}
            /> 
        </div>
    </div>
    
    <div class="ta-center">
        {#if currentPlayingNode}
        <!-- <a>
            class="practiceLink button outlined" 
            href={"practicenode/" + currentPlayingNode.id}>
            Practice {currentPlayingNode.id}
        </a> -->
        <span class="practiceLink">{currentPlayingNode.id}</span>
        <SketchButton on:click={practiceClicked}>Practice</SketchButton>
        {/if}
    </div>
    
    <div class="preview">
        <div class="controls">
            <div class="control">
                <label for="playbackSpeed">Playback Speed</label>
                <input type="range" name="playbackSpeed" bind:value={videoPlaybackSpeed} min="0.5" max="2" step="0.1" />
                {videoPlaybackSpeed.toFixed(1)}x
            </div>
            <div class="control">
            <!-- {videoDuration}-{videoPaused ? "Paused" : "Playing"}  -->
            </div>
        </div>
        
        <VideoWithSkeleton bind:currentTime={videoCurrentTime}
            bind:playbackRate={videoPlaybackSpeed}
            bind:duration={videoDuration}
            bind:paused={videoPaused}
            bind:fitToFlexbox={fitVideoToFlexbox}
            drawSkeleton={false}
            >
            <source src={danceSrc} type="video/mp4" />
        </VideoWithSkeleton>
    
    </div>
    <!-- <dialog id="practicePage" bind:this={practicePageDialogElement}>
        <button class="button outlined thin close" aria-label="Close" on:click={() => {practicePageActive = false; practicePageDialogElement.close();}}>X</button>
        <PracticePage 
            bind:this={practicePage} 
            dance={dance} 
            practiceActivity={currentPracticeActivity}
            pageActive={practicePageActive}
        />
    </dialog> -->
</section>


<style lang="scss">
section {
    position: relative;
    width: 100vw;
    height: 100vh;
    /* padding: 1em; */
    /* align-self: stretch; */
    box-sizing: border-box;
    display: grid;
    overflow: hidden;
    grid-template-rows: 3rem auto auto minmax(0, 1fr); 
}

.preview {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: stretch;
    overflow: hidden;
    padding-bottom: 1rem;

    & video {
        flex-grow: 1;
        flex-shrink: 1;
        flex-basis: 1rem;
        // max-width: 100%;
        // max-height: 100%;
        border-radius: 0.5em;
        height: 0
    }

    & .videoContainer {
        flex-grow: 1;
        flex-shrink: 1;
        flex-basis: 1rem;
        height: 0;
        overflow: hidden;
    }
}

.visual-tree {
    // position: relative;
    // width: 400px;
    max-width: 100vw;
    // padding: 1em;
    // max-width: 200ch;
    // overflow-y: scroll;
    margin: 1rem;
}
.visual-tree div {
    display: flex;
    // padding: 1em;
    overflow-x: auto;
}

div:has(.practiceLink) {
    margin-bottom: 1rem;
}

.control {
    display: flex;
    flex-direction: row; 
    align-items: center;
    justify-content: center;
}
</style>

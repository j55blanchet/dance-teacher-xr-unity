<script lang="ts">

import { readable } from 'svelte/store';

import type { DanceTree, Dance, DanceTreeNode } from '$lib/dances-store';
import DanceTreeVisual from '$lib/DanceTreeVisual.svelte';
	import { tick } from 'svelte';

/** @type {import('./$types').PageData} */    
export let data;

const dance: Dance = data.dance;
const danceTree: DanceTree = data.danceTree;

let danceSrc: string = '';
$: {
    danceSrc = `/bundle/videos/${dance.clipPath}`;
}

let videoElement: HTMLVideoElement;
let stopTime: number = Infinity;
let videoCurrentTime: number = 0;
let videoPlaybackSpeed: number = 1;
let currentPlayingNode: DanceTreeNode | null = null;
let showProgressNodes: Array<DanceTreeNode> = [];
$: {
    showProgressNodes = currentPlayingNode !== null ? 
        [currentPlayingNode]:
        [];
}
$: if (videoCurrentTime > stopTime) {
    videoElement.pause();
}

async function onNodeClicked(e: any) {
    console.log('node clicked', e.detail);

    currentPlayingNode = e.detail;
    if (videoElement) {
        videoElement.currentTime = e.detail.start_time;
        stopTime = e.detail.end_time;
        await tick();
        videoElement.play();
    }
}

function showProgress(node: DanceTreeNode) {
    return node === currentPlayingNode;
}
</script>

<section>
    <nav>
        <a class="button" href="/">&lt; Go Home</a>
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
    <div class="preview">
        <video bind:this={videoElement}
               bind:currentTime={videoCurrentTime}
               bind:playbackRate={videoPlaybackSpeed}>
            <source src={danceSrc} type="video/mp4" />
        </video>
        <div class="controls">
            <label>Playback Speed
                <input type="range" name="playbackSpeed" bind:value={videoPlaybackSpeed} min="0.5" max="2" step="0.1" />
            </label>
        </div>    
    </div>
</section>


<style lang="scss">
    .preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        overflow: hidden;
        padding-bottom: 1rem;

        & video {
            flex-grow: 1;
            flex-shrink: 1;
            flex-basis: 1rem;
            max-width: 100%;
            max-height: 100%;
            border-radius: 0.5em;
        }
    }

    section {
        position: relative;
        width: 100vw;
        height: 100vh;
        /* padding: 1em; */
        /* align-self: stretch; */
        box-sizing: border-box;
        display: grid;
        overflow: hidden;
        grid-template-rows: 3rem auto minmax(0, 1fr); 
    }

    nav {
        /* padding: 0.5rem; */
        padding: 0 0.5em;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        background: rgba(0, 0, 0, .2);
    }

    nav h1 {
        margin: 0;
        padding: 0;
        font-size: 2rem;
    }

    .visual-tree {
        // position: relative;
        // width: 400px;
        max-width: 100vw;
        // padding: 1em;
        // max-width: 200ch;
        // overflow-y: scroll;
    }
    .visual-tree div {
        display: flex;
        padding: 1em;
        overflow-x: auto;
    }

</style>
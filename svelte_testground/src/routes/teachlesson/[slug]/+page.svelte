<script lang="ts">
import { readable } from 'svelte/store';

import type { DanceTree, Dance, DanceTreeNode } from '$lib/dances-store';
import { getDanceVideoSrc } from '$lib/dances-store';
import DanceTreeVisual from '$lib/DanceTreeVisual.svelte';
import PracticePage from '$lib/PracticePage.svelte';
import { tick } from 'svelte';

import { GeneratePracticeActivity } from '$lib/ai/TeachingAgent';
import type PracticeActivity from '$lib/PracticeActivity';

/** @type {import('./$types').PageData} */    
export let data;

const dance: Dance = data.dance;
const danceTree: DanceTree = data.danceTree;

let danceSrc: string = '';
$: {
    danceSrc = getDanceVideoSrc(dance);
}

let videoElement: HTMLVideoElement;
let practicePageDialogElement: HTMLDialogElement;
let practicePage: PracticePage;
let stopTime: number = Infinity;
let videoCurrentTime: number = 0;
let videoPlaybackSpeed: number = 1;
let currentPlayingNode: DanceTreeNode | null = null;
let showProgressNodes: Array<DanceTreeNode> = [];
let currentPracticeActivity: PracticeActivity | null = null;
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

    const selectedTreeNode = e.detail as DanceTreeNode;
    currentPlayingNode = selectedTreeNode;
    // if (videoElement) {
    //     videoElement.currentTime = e.detail.start_time;
    //     stopTime = e.detail.end_time;
    //     await tick();
    //     videoElement.play();
    // }

    currentPracticeActivity = GeneratePracticeActivity(
        dance,
        danceTree,
        selectedTreeNode,
        {} // UserDancePerformanceLog
    )

    if (practicePageDialogElement) {
        practicePage.reset();
        practicePageDialogElement.showModal();
    }
}

function showProgress(node: DanceTreeNode) {
    return node === currentPlayingNode;
}
</script>

<svelte:head>
	<title>Dance | {dance.title}</title>
	<meta name="description" content="App for learning the dance: {dance.title}" />
</svelte:head>

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
    <dialog id="practicePage" bind:this={practicePageDialogElement}>
        <form method="dialog" class="close">
            <button class="outlined thin" aria-label="Close">X</button>
        </form>
        <PracticePage bind:this={practicePage} dance={dance} practiceActivity={currentPracticeActivity}/>
    </dialog>
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

    #practicePage {
        box-sizing: border-box;
        width: 100vw;
        height: 100vh;

        &::backdrop {
            background-color: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(1rem);
        }

        & form.close {
            position: absolute;
            z-index: 2;

          & button {
            font-size: 2rem;
            padding: 0.25em;
            aspect-ratio: 1;
            display: inline-flex;
            justify-content: center;
            align-items: center;
          }  
        }
    }

</style>
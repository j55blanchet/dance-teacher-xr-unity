<script lang="ts">

import { readable } from 'svelte/store';

import type { DanceTree, Dance } from '$lib/dances-store';
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

$: if (videoCurrentTime > stopTime) {
    videoElement.pause();
}

async function onNodeClicked(e: any) {
    console.log('node clicked', e.detail);

    if (videoElement) {
        videoElement.currentTime = e.detail.start_time;
        stopTime = e.detail.end_time;
        await tick();
        videoElement.play();
    }
}
</script>

<section>
    <nav>
        <a class="button" href="/">&lt; Go Home</a>
        <h1 class="title">
            {dance.title}
            <span class="subtitle">{danceTree.tree_name}</span>
        </h1>
        <div>
        </div>
    </nav>
    <div class="visual-tree">
        <div>
            <DanceTreeVisual on:nodeClicked={onNodeClicked} enableClick node={danceTree.root} /> 
        </div>
    </div>
    <div class="preview">
        <video bind:this={videoElement}
        bind:currentTime={videoCurrentTime}>
            <source src={danceSrc} type="video/mp4" />
        </video>    
    </div>
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
        grid-template-rows: 3rem auto 1fr; 
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

    nav .subtitle {
        font-size: 1.5rem;
        font-weight: 100;
        color: gray;
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
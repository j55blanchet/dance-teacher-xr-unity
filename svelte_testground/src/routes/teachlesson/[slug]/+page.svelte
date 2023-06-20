<script lang="ts">

import { readable } from 'svelte/store';

import type { DanceTree, Dance } from '$lib/dances-store';
import DanceTreeVisual from '$lib/DanceTreeVisual.svelte';

/** @type {import('./$types').PageData} */    
export let data;

const dance: Dance = data.dance;
const danceTree: DanceTree = data.danceTree;

let danceSrc: Promise<string>;
$: {
    danceSrc = import("../lib/data/bundle/videos/" + dance.clipPath);
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
        <DanceTreeVisual node={danceTree.root} />
    </div>
    <div class="preview">
        {dance.clipPath}
        
        <video>
            <source src={"/lib/data/bundle/videos/" + dance.clipPath} type="video/mp4" />
        </video>
    </div>
    
</section>


<style lang="scss">
    section {
        width: 100vw;
        height: 100vh;
        /* padding: 1em; */
        /* align-self: stretch; */
        box-sizing: border-box;
        display: grid;
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
        position: relative;
        padding: 1em;
        max-width: 200ch;
    }
</style>
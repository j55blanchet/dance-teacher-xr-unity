<script lang="ts">
import { goto } from '$app/navigation';
import { GeneratePracticeActivity } from '$lib/ai/TeachingAgent';
import { makeDanceTreeSlug, type DanceTree, type Dance, type DanceTreeNode } from '$lib/dances-store';
import PracticePage from '$lib/pages/PracticePage.svelte';
import { initialState, type PracticePageState } from '$lib/pages/PracticePage.svelte';

/** @type {import('./$types').PageData} */    
export let data;
const dance: Dance = data.dance;
const danceTree: DanceTree = data.danceTree;
const node: DanceTreeNode = data.danceTreeNode;

const practiceActivity = GeneratePracticeActivity (
    dance,
    danceTree,
    node,
    {} // UserDancePerformanceLog
)

let parentURL = "/teachlesson/" + makeDanceTreeSlug(danceTree)
$: {
    parentURL = "/teachlesson/" + makeDanceTreeSlug(danceTree)
}
let pageState: PracticePageState = initialState;

const StatesWithHiddenBackButton = new Set(["countdown", "playing", "paused"]);
let hideBackButton = false;
$: {
    hideBackButton = StatesWithHiddenBackButton.has(pageState)
}
</script>


<section class="practiceNode">
    <PracticePage 
        {dance} 
        {practiceActivity}
        pageActive={true}
        on:continue-clicked={() => goto(parentURL)}
        on:stateChanged={(e) => pageState = e.detail}
    />
    {#if !hideBackButton}
        <a href={parentURL} class="button outlined back">&lt; {danceTree.tree_name}</a>
    {/if}
</section>



<style lang="scss">

section {
    box-sizing: border-box;
    height: 100vh;
    width: 100%;
    padding: 1rem;
}

.back {
    position: absolute;
    top: 1rem;
    left: 1rem;
    background-color: var(--color-bg-0);
}
</style>
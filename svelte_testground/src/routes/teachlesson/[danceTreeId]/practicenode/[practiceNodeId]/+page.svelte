<script lang="ts">
import { GeneratePracticeActivity } from '$lib/ai/TeachingAgent';
import { makeDanceTreeSlug, type DanceTree, type Dance, type DanceTreeNode } from '$lib/dances-store';
import PracticePage from '$lib/PracticePage.svelte';

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

</script>


<section class="practiceNode">
    <PracticePage 
        {dance} 
        {practiceActivity}
        pageActive={true}
    />
    <a href={parentURL} class="button outlined back">&lt; {danceTree.tree_name}</a>
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
<script lang="ts">
import { goto } from '$app/navigation';
import { GeneratePracticeActivity } from '$lib/ai/TeachingAgent';
import { makeDanceTreeSlug, type DanceTree, type Dance, type DanceTreeNode } from '$lib/dances-store';
import PracticePage from '$lib/pages/PracticePage.svelte';
import { initialState, type PracticePageState } from '$lib/pages/PracticePage.svelte';
import { navbarProps } from '$lib/elements/NavBar.svelte';

/** @type {import('./$types').PageData} */    
export let data;
const dance: Dance = data.dance;
const danceTree: DanceTree = data.danceTree;
const node: DanceTreeNode = data.danceTreeNode;

const practiceActivity = GeneratePracticeActivity (
    dance,
    danceTree,
    node,
    // {} //  UserDancePerformanceLog
)

let parentURL = "/teachlesson/" + makeDanceTreeSlug(danceTree)
$: {
    parentURL = "/teachlesson/" + makeDanceTreeSlug(danceTree)
}
let pageState: PracticePageState = initialState;

const StatesWithHiddenBackButton = new Set(["countdown", "playing", "paused"]);
let hideNavBar = false;
$: {
    hideNavBar = StatesWithHiddenBackButton.has(pageState);
}

$: {
    navbarProps.set({
        collapsed: hideNavBar,
        pageTitle: `${dance.title}: ${node.id}`,
        back: {
            url: parentURL,
            title: 'Back',
        },
    });
}

</script>

<section>
    <PracticePage 
        {dance} 
        {practiceActivity}
        pageActive={true}
        on:continue-clicked={() => goto(parentURL)}
        on:stateChanged={(e) => pageState = e.detail}
    />
</section>

<style lang="scss">
section {
    height: var(--content_height);
    width: 100%;
    padding: 1rem;
    box-sizing: border-box;
}
</style>
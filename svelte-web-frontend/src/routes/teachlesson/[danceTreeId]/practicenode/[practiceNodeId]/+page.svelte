<script lang="ts">
import { goto } from '$app/navigation';
import { GeneratePracticeActivity } from '$lib/ai/TeachingAgent';
import { makeDanceTreeSlug, type DanceTree, type Dance, type DanceTreeNode } from '$lib/data/dances-store';
import PracticePage from '$lib/pages/PracticePage.svelte';
import { INITIAL_STATE, type PracticePageState } from '$lib/pages/PracticePage.svelte';
import { navbarProps } from '$lib/elements/NavBar.svelte';
import type PracticeActivity from '$lib/model/PracticeActivity';
import type { PracticeInterfaceModeKey } from '$lib/model/PracticeActivity';

/** @type {import('./$types').PageData} */    
export let data;
const dance: Dance = data.dance;
const danceTree: DanceTree = data.danceTree;
const danceTreeNode: DanceTreeNode = data.danceTreeNode;
const playbackSpeed: number = data.playbackSpeed;

const interfaceModeKey: PracticeInterfaceModeKey = data.interfaceMode;
const terminalFeedbackEnabled: boolean = data.terminalFeedbackEnabled;
const enableUserSkeletonColorCoding: boolean = data.enableUserSkeletonColorCoding;

let { activity, url } = GeneratePracticeActivity({
    dance,
    danceTree,
    danceTreeNode,
    playbackSpeed,
    interfaceMode: interfaceModeKey,
    terminalFeedbackEnabled,
    enableUserSkeletonColorCoding,
})
let practiceActivity: PracticeActivity = activity;

let parentURL: string;
$: {
    parentURL = `/teachlesson/${makeDanceTreeSlug(danceTree)}?preselectedNodeId=${danceTreeNode.id}`
}
let pageState: PracticePageState = INITIAL_STATE;

const StatesWithHiddenBackButton = new Set([] as string[]);
let hideNavBar = false;
$: {
    hideNavBar = StatesWithHiddenBackButton.has(pageState);
}

$: {
    navbarProps.set({
        collapsed: hideNavBar,
        pageTitle: `${dance.title}: ${danceTreeNode.id}`,
        back: {
            url: parentURL,
            title: 'Back',
        },
    });
}

</script>

<svelte:head>
	<title>{dance.title} '{danceTreeNode.id}' Practice</title>
	<meta name="description" content="Practice page for section {danceTreeNode.id} of dance: {dance.title}" />
</svelte:head>

<section>
    <PracticePage 
        {dance} 
        bind:practiceActivity={practiceActivity}
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
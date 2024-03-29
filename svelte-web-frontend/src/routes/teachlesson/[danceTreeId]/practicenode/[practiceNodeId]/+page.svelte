<script lang="ts">
import { goto } from '$app/navigation';
import { GeneratePracticeStep } from '$lib/ai/TeachingAgent/TeachingAgent';
import { makeDanceTreeSlug, type DanceTree, type Dance, type DanceTreeNode } from '$lib/data/dances-store';
import PracticePage from '$lib/pages/PracticePage.svelte';
import { INITIAL_STATE, type PracticePageState } from '$lib/pages/PracticePage.svelte';
import { navbarProps } from '$lib/elements/NavBar.svelte';
import type PracticeActivity from '$lib/model/PracticeStep';
import type { PracticeStepModeKey } from '$lib/model/PracticeStep';
import { practiceActivities__playbackSpeed } from '$lib/model/settings';

/** @type {import('./$types').PageData} */    
export let data;
const dance: Dance = data.dance;
const danceTree: DanceTree = data.danceTree;
const danceTreeNode: DanceTreeNode = data.danceTreeNode;
const playbackSpeed: number = data.playbackSpeed ?? $practiceActivities__playbackSpeed; 

const interfaceMode: PracticeStepModeKey = data.interfaceMode;
const terminalFeedbackEnabled: boolean = data.terminalFeedbackEnabled;
const showUserSkeleton: boolean = data.showUserSkeleton;

let { step: activity, url } = GeneratePracticeStep(
    dance,
    danceTree,
    danceTreeNode,
    {
        playbackSpeed,
        interfaceMode,
        terminalFeedbackEnabled,
        showUserSkeleton: showUserSkeleton,
    }
)
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
	<title>Practice '{danceTreeNode.id}' | {dance.title} | Dance Teacher</title>
	<meta name="description" content="Practice page for section {danceTreeNode.id} of dance: {dance.title}" />
</svelte:head>

<section>
    <PracticePage 
        {dance} 
        bind:practiceStep={practiceActivity}
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
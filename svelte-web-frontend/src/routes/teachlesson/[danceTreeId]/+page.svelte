<script lang="ts">
import DanceTreePage from "$lib/pages/DanceTreePage.svelte";
import type { DanceTree, Dance } from '$lib/data/dances-store';

/** @type {import('./$types').PageData} */    
export let data;
const dance: Dance = data.dance;
const danceTree: DanceTree = data.danceTree;

</script>

<svelte:head>
	<title>{dance.title} (Preview)</title>
	<meta name="description" content="App for learning the dance: {dance.title}" />
</svelte:head>

<DanceTreePage {dance} {danceTree} />

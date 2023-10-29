<script lang="ts">
import DanceTreePage from "$lib/pages/DanceTreePage.svelte";
import type { DanceTree, Dance } from '$lib/data/dances-store';
import { navbarProps } from "$lib/elements/NavBar.svelte";
	import { browser } from "$app/environment";
	import { navigating } from "$app/stores";

/** @type {import('./$types').PageData} */    
export let data;
const dance: Dance = data.dance;
const danceTree: DanceTree = data.danceTree;
const preselectedNodeId = data.preselectedNodeId;
$: {
	navbarProps.set({
		collapsed: false,
		pageTitle: `${dance.title}`,
		back: {
			url: '/',
			title: 'Menu',
		},
	});
}

function updateQueryParams(selectedNodeId: string) {
	// TODO: update search query parameters, so that user will 
	//       see the selected node persist upon a refresh.
}
</script>

<svelte:head>
	<title>{dance.title} (Preview) ({preselectedNodeId})</title>
	<meta name="description" content="App for learning the dance: {dance.title}" />
</svelte:head>

<DanceTreePage 
	{dance} 
	{danceTree}
	preselectedNodeId={preselectedNodeId}
	on:selected-node={(e) => updateQueryParams(e.detail)} />

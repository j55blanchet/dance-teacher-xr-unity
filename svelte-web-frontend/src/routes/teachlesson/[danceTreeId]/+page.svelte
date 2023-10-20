<script lang="ts">
import DanceTreePage from "$lib/pages/DanceTreePage.svelte";
import type { DanceTree, Dance } from '$lib/data/dances-store';
import { navbarProps } from "$lib/elements/NavBar.svelte";

/** @type {import('./$types').PageData} */    
export let data;
const dance: Dance = data.dance;
const danceTree: DanceTree = data.danceTree;

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

</script>

<svelte:head>
	<title>{dance.title} (Preview)</title>
	<meta name="description" content="App for learning the dance: {dance.title}" />
</svelte:head>

<DanceTreePage {dance} {danceTree} />

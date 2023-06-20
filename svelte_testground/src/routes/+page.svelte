<script lang="ts">
	import { dances, danceTrees, makeDanceTreeSlug } from '$lib/dances-store';
	import type { DanceTree, Dance } from '$lib/dances-store';

	let selectedDance: Dance | null = null;

	let availableDanceTrees: Array<DanceTree> = [];
	
	// @ts-ignore
	$: availableDanceTrees = danceTrees[selectedDance?.clip_relativepath] ?? [];

	function toggleSelectDance(dance: Dance) {
		if (selectedDance === dance) {
			selectedDance = null;
		} else {
			selectedDance = dance;
		}
	}
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<h1>
		LearnThatDance 2.0
	</h1>

	
	<div class="cols">
		<div class="col dance-picking ta-center" style="max-width: 40ch;">
			<p>Pick a dance</p>
			<ul>
				{#each dances as dance (dance.clip_relativepath)}
				<li class="outlined thin" 
					class:selected={dance === selectedDance}
					on:click={(event) => toggleSelectDance(dance)}>{dance.title}</li>
				{/each}
			</ul>
		</div>
		{#if selectedDance}
		<div class="col" style="max-width: 40ch;">
			<p>{selectedDance.title}</p>
			<ul>
				{#each availableDanceTrees as danceTree (danceTree.clip_relativepath)}
				<a href={"/teachlesson/" + makeDanceTreeSlug(danceTree)}><li class="outlined thin">{danceTree.tree_name}</li></a>
				{/each}
			</ul>
		</div>
		{/if}
	</div>
	
	<!-- <Counter /> -->
</section>

<style>
	section {
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
		margin: 0 1rem;
	}
	p {
		font-size: 1.1rem;
		margin-bottom: 0;
		padding: 0.25em 0.5em;
		
	}

	ul li.selected {
		background-color: #dedede;
		box-shadow: 0 0 2px #000;
		scale: 1.04 1;
	}

	ul {
		margin-top: 0;
		padding: 0;
	}

	ul li {
		list-style: none;
		padding: 0.25em 0.5em;
		scale: 1;
		transition: background-color 0.2s ease-in-out,
			box-shadow 0.2s ease-in-out
			scale 0.2s ease-in-out;
	}

	ul li:not(:last-child) {
		margin-bottom: 0.15em;
}

	ul li:hover {
		cursor: pointer;
		background-color: #dedede;
		box-shadow: 0 0 2px #000;
		scale: 1.04 1;
	}
</style>

<script>
	import Counter from './Counter.svelte';
	import welcome from '$lib/images/svelte-welcome.webp';
	import welcome_fallback from '$lib/images/svelte-welcome.png';

	import { dances } from '$lib/dances-store';
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<h1>
		LearnThatDance 2.0
	</h1>

	<p>Pick a dance</p>
	<ul>
		{#each $dances as dance (dance.clip_relativepath)}
		<li class="outlined thin">{dance.title}</li>
		{/each}
	</ul>
	<!-- <Counter /> -->
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
		margin: 0 auto;
	}
	p {
		font-size: 1.1rem;
		margin-bottom: 0;
		padding: 0.25em 0.5em;
		
	}

	ul {
		margin-top: 0;
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

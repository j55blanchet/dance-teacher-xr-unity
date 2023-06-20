<script>
	import VirtualMirror from '$lib/VirtualMirror.svelte';
	import SketchButton from '$lib/SketchButton.svelte';

	import './styles.scss';
	import { onMount } from "svelte";


	let webcamStarted = false;
	// const dispatch = createEventDispatcher();

	// function handleWebcamStarted();
	// 	dispatch('webcamStarted', webcamStarted);
	// }

</script>

<div class="app">
	<!-- <div class="background"> -->
		<!-- <VirtualMirror bind:webcamStarted /> -->
	<!-- </div> -->
	<!-- <Header /> -->

	<!-- {#if webcamStarted}
		<main>
			<SketchButton>Hi</SketchButton>
			<slot />
		</main>
	{/if} -->

	<slot />

	<!--  <footer>
		<p>visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to learn SvelteKit</p>
	</footer> -->
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		align-items: start;
		justify-content: center;
	}

</style>

<script>
	import Header from './Header.svelte';
	import VirtualMirror from './VirtualMirror.svelte';
	import './styles.css';


	let webcamStarted = false;
	// const dispatch = createEventDispatcher();

	// function handleWebcamStarted();
	// 	dispatch('webcamStarted', webcamStarted);
	// }
</script>

<div class="app">
	<div class="background">
		<VirtualMirror bind:webcamStarted />
	</div>
	<!-- <Header /> -->

	{#if webcamStarted}
		<main>
			<slot />
		</main>
	{/if}

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
		justify-content: left;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		/* width: 100%; */
		max-width: 64rem;
		/* margin: 0 auto; */
		box-sizing: border-box;
		justify-content: left;
		align-items: start;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 12px;
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 480px) {
		footer {
			padding: 12px 0;
		}
	}

	main {
		z-index: 2;
		width: 50%;
	}
	
	.background {
		z-index: 1;
		width: 50%;
		height: 100%;
		position: absolute;
		right: 0;
	}

</style>

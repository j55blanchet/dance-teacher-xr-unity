<script>
	import { writable } from 'svelte/store';
	import { setContext } from 'svelte';
	import { webcamStream } from '$lib/webcam/streams';
	import NavBar, { navbarProps } from '$lib/elements/NavBar.svelte';
	import './styles.scss';

</script>

<div class="app" class:noNavBar={$navbarProps.collapsed}>
	<NavBar />

	<slot />

	<div class="debug">
		{$webcamStream}
		<slot name="debug" />
	</div>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		align-items: start;
		justify-content: center;
		--navbar_height: 3rem;
		--content_height: calc(100vh - var(--navbar_height));
	}

	.app.noNavBar {
		--content_height: 100vh;
	}

	.debug {
		position: absolute;
		visibility: hidden;
	}
</style>

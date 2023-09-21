<script>
	import { writable } from 'svelte/store';
	import { setContext } from 'svelte';
	import { webcamStream } from '$lib/webcam/streams';
	import NavBar, { navbarProps } from '$lib/elements/NavBar.svelte';
	import './styles.scss';
	import SettingsPage from '$lib/pages/SettingsPage.svelte';

	let showingSettings = false;
	function toggleSettings() {
		showingSettings = !showingSettings;
	}
</script>

<div class="app" class:noNavBar={$navbarProps.collapsed}>
	<NavBar on:settingsButtonClicked={toggleSettings} settingsActive={showingSettings}/>

	<slot />

	<div class="debug">
		{$webcamStream}
		<slot name="debug" />
	</div>

	<dialog class="settingsDialog" open={showingSettings}>
		<SettingsPage />
	</dialog>
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
		--navbar_height: 0;
	}

	.debug {
		position: absolute;
		visibility: hidden;
	}

	.settingsDialog {
		position: absolute;
		top: calc(var(--navbar_height) + 1rem);
		left: 1rem;
		right: 1rem;
		--content_height: auto;
		/* background: rgba(0, 0, 0, 0.5); */
	}
</style>

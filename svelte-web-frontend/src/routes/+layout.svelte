<script lang="ts">
	import { writable } from 'svelte/store';
	import { setContext } from 'svelte';
	import { webcamStream } from '$lib/webcam/streams';
	import NavBar, { navbarProps } from '$lib/elements/NavBar.svelte';
	import './styles.scss';
	import SettingsPage from '$lib/pages/SettingsPage.svelte';
	import CloseButton from '$lib/elements/CloseButton.svelte';

	let settingsDialog: HTMLDialogElement;

	let showingSettings = false;
	function toggleSettings() {
		showingSettings = !showingSettings;
		if (showingSettings) {
			settingsDialog.showModal();
		} else {
			settingsDialog.close();
		}
	}
</script>

<div class="app" class:noNavBar={$navbarProps.collapsed}>
	<NavBar on:settingsButtonClicked={toggleSettings} settingsActive={showingSettings}/>

	<slot />

	<div class="debug">
		{$webcamStream}
		<slot name="debug" />
	</div>

	<dialog class="settingsDialog" bind:this={settingsDialog}>
		<CloseButton on:click={toggleSettings} />
		<div class="settingsContainer outlined">
			<SettingsPage />
		</div>
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
		/* top: calc(var(--navbar_height) + 1rem); */
		/* left: 1rem; */
		/* right: 1rem; */
		--content_height: auto;
		margin-top: 0;
		margin-right: 0;
		max-width: calc(100vw - 2rem);
		padding: 0.5em;
		background: none;
		border: none;
		/* background: rgba(0, 0, 0, 0.5); */
	}

	.settingsDialog::backdrop {
		background: rgba(0, 0, 0, 0.2);
		backdrop-filter: blur(5px);
	}

	.settingsContainer {
		background: white;
		margin-top: 0.5rem;
	}
</style>

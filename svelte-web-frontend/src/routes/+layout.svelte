<script lang="ts">
	import { tick, onMount, setContext } from 'svelte';
	import { webcamStream } from '$lib/webcam/streams';
	import NavBar, { navbarProps } from '$lib/elements/NavBar.svelte';
	import './styles.scss';
	import SettingsPage from '$lib/pages/SettingsPage.svelte';
	import CloseButton from '$lib/elements/CloseButton.svelte';
	import { invalidate } from '$app/navigation'
	import { waitSecs } from '$lib/utils/async';

	let settingsDialog: HTMLDialogElement;

	let showingSettings = false;
	let showingSettingsCloseButton = false;
	async function toggleSettings(setValue?: boolean) {
		showingSettings = !showingSettings;
		showingSettings = setValue ?? showingSettings;
		if (showingSettings) {
			settingsDialog.showModal();
			
			// Delay showing the close button until the dialog has finished opening,
			// so that the animation can be appreciated
			await tick();
			await waitSecs(0.1);
			showingSettingsCloseButton = true;
		} else {
			showingSettingsCloseButton = false;
			settingsDialog.close();
		}
	}

	export let data

	let { supabase, session } = data
	$: ({ supabase, session } = data)

	setContext('supabase', supabase);

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((event, _session) => {
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth')
			}
		})

		return () => data.subscription.unsubscribe()
	})
</script>


<NavBar on:settingsButtonClicked={() => toggleSettings()} settingsActive={showingSettings}/>
<slot />
<dialog class="settingsDialog" bind:this={settingsDialog}>
	<div class="card">
		<div class="card-header">
			<h3 class="card-header-title is-centered">Settings</h3>
			<div class="card-header-icon"><CloseButton isVisible={showingSettingsCloseButton} on:click={() => toggleSettings()} /></div>
		</div>
		<div class="closeButtonContainer">
			
		</div>
		<div class="settingsContainer ">
			<SettingsPage 
				user={session?.user ?? null} 
				on:navigate={() => toggleSettings(false)}/>
		</div>
	</div>
</dialog>


<style lang="scss">
	:root {
		// display: flex;
		// flex-direction: column;
		--content_height: calc(100vh - var(--navbar_height));
		min-height: var(--content_height);
		// align-items: center;
		// justify-content: center;
		--navbar_height: 3rem;
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
		margin-top: 1rem;
		margin-right: 1rem;
		max-width: calc(100vw - 2rem);
		padding: 0;
		background: none;
		border: none;
		/* background: rgba(0, 0, 0, 0.5); */
	}

	.closeButtonContainer {
		display: flex;
		justify-content: flex-end;	
	}

	.settingsDialog::backdrop {
		background: rgba(0, 0, 0, 0.2);
		backdrop-filter: blur(5px);
		--webkit-backdrop-filter: blur(5px);
	}
</style>

<script lang="ts">
	import "../app.pcss";
	import { tick, onMount, setContext } from 'svelte';
	import { webcamStream } from '$lib/webcam/streams';
	import NavBar, { navbarProps } from '$lib/elements/NavBar.svelte';
	import './styles.scss';
	import SettingsPage from '$lib/pages/SettingsPage.svelte';
	import CloseButton from '$lib/elements/CloseButton.svelte';
	import { invalidate } from '$app/navigation'
	import { waitSecs } from '$lib/utils/async';
	import Dialog from "$lib/elements/Dialog.svelte";
	import { navigating } from "$app/stores";
	import { debugMode } from "$lib/model/settings";
	import type { User } from "@supabase/supabase-js";


	let showingSettings = false;
	async function toggleSettings(setValue?: boolean) {
		showingSettings = !showingSettings;
		showingSettings = setValue ?? showingSettings;
	}

	export let data

	let { supabase, session } = data
	$: ({ supabase, session } = data)

	let user: User | null = null;

	setContext('supabase', supabase);

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((event, _session) => {
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth')
			}
			supabase.auth.getUser().then(userResp => {
				user = userResp.data.user;
			});
		})

		return () => data.subscription.unsubscribe()
	})

	// let showNavigationOverlay = false;
	// let navigationOverlayTimeout: number | undefined = undefined;
	// $: {
	// 	if ($navigating && !navigationOverlayTimeout) {
	// 		setTimeout(() => {
	// 			navigationOverlayTimeout = undefined;
	// 			if ($navigating) {
	// 				showNavigationOverlay = true;
	// 			}
	// 		}, 500);
	// 	}
	// }
	// $: if (!$navigating) {
	// 	showNavigationOverlay = false;
	// 	if (navigationOverlayTimeout !== undefined) {
	// 		clearTimeout(navigationOverlayTimeout);
	// 		navigationOverlayTimeout = undefined;
	// 	}
	// }
</script>

<NavBar on:settingsButtonClicked={() => toggleSettings()} settingsActive={showingSettings}/>
<div class="app-content" class:noNavBar={$navbarProps.collapsed} >
	<slot />
</div>

<!-- <div class="inset-4 flex items-center justify-center" 
	class:absolute={showNavigationOverlay}
	class:hidden={showNavigationOverlay}>

	<div class="daisy-card w-96 bg-neutral text-neutral-content">
		<div class="daisy-card-body items-center text-center">
		  <h2 class="daisy-card-title"><span class="daisy-loading daisy-loading-ring daisy-loading-lg"></span></h2>
		  <p>Navigating</p>
		</div>
	</div>
</div> -->
<Dialog bind:open={showingSettings} 
	modal={true} 
	showCloseButton={true} closeWhenClickedOutside={true}
	on:dialog-closed={() => showingSettings = false}>
	<span slot="title">Settings</span>
	<SettingsPage 
		user={user ?? null} 
		on:navigate={() => toggleSettings(false)}/>
</Dialog>


<style lang="scss">
	.app-content {
		// display: flex;
		// flex-direction: column;
		--content_height: calc(100vh - var(--navbar_height));
		min-height: var(--content_height);
		// align-items: center;
		// justify-content: center;
		--navbar_height: 3.25rem;
	}

	.app-content.noNavBar {
		--content_height: 100vh;
		--navbar_height: 0;
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

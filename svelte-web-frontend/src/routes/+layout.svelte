<script lang="ts">
	import { run } from 'svelte/legacy';

	import '../app.pcss';
	import { tick, onMount, setContext } from 'svelte';
	import { webcamStream } from '$lib/webcam/streams';
	import NavBar, { navbarProps } from '$lib/elements/NavBar.svelte';
	import './styles.scss';
	import SettingsPage from '$lib/pages/SettingsPage.svelte';
	import CloseButton from '$lib/elements/CloseButton.svelte';
	import { invalidate } from '$app/navigation';
	import { waitSecs } from '$lib/utils/async';
	import Dialog from '$lib/elements/Dialog.svelte';
	import { navigating } from '$app/stores';
	import { debugMode } from '$lib/model/settings';
	import type { User } from '@supabase/supabase-js';

	let showingSettings = $state(false);
	async function toggleSettings(setValue?: boolean) {
		showingSettings = !showingSettings;
		showingSettings = setValue ?? showingSettings;
	}

	let { data, children } = $props();
	let { session, supabase } = $derived(data);

	onMount(() => {
		const { data } = supabase.auth.onAuthStateChange((_, newSession) => {
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => data.subscription.unsubscribe();
	});

</script>

<NavBar on:settingsButtonClicked={() => toggleSettings()} settingsActive={showingSettings} />
<div class="app-content" class:noNavBar={$navbarProps.collapsed}>
	{@render children?.()}
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
<Dialog
	bind:open={showingSettings}
	modal={true}
	showCloseButton={true}
	closeWhenClickedOutside={true}
	on:dialog-closed={() => (showingSettings = false)}
>
	{#snippet title()}
		<span>Settings</span>
	{/snippet}
	<SettingsPage user={data.user ?? null} on:navigate={() => toggleSettings(false)} />
</Dialog>

<style lang="scss">
	.app-content {
		// display: flex;
		// flex-direction: column;
		--content_height: calc(100vh - var(--navbar_height));
		min-height: var(--content_height);
		// align-items: center;
		// justify-content: center;
		--navbar_height: 4rem;
	}

	.app-content.noNavBar {
		--content_height: 100vh;
		--navbar_height: 0;
	}
</style>

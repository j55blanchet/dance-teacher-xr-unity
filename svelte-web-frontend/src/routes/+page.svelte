<script lang="ts">
import { navbarProps } from "$lib/elements/NavBar.svelte";
import MainMenuPage from "$lib/pages/MainMenuPage.svelte";
import { onMount } from "svelte";
import { Auth } from '@supabase/auth-ui-svelte'
import { ThemeSupa } from '@supabase/auth-ui-shared'

export let data

onMount(() => {
	navbarProps.set({
		collapsed: true,
		pageTitle: "Login",
	});
});
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>	

<div class="row flex-center flex">
	<div class="col-6 form-widget">
		<h3>Login</h3>
		<Auth
			supabaseClient={data.supabase}
			view="magic_link"
			redirectTo={`${data.url}/auth/callback`}
			showLinks={false}
			appearance={{ theme: ThemeSupa }}
		/>
	</div>
</div>
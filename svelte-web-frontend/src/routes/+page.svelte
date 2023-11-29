<script lang="ts">
import { navbarProps } from "$lib/elements/NavBar.svelte";
import { onMount } from "svelte";
import EmailAuthView from "$lib/elements/auth/EmailAuthView.svelte";

export let data

let state = "sign_in" as "sign_in" | "sign_up" | "forgot_password";

let redirectPath: string;
$: redirectPath = `${data.origin}/auth/callback`;
onMount(() => {
	navbarProps.set({
		collapsed: true,
		pageTitle: "Login",
	});
	redirectPath = `${data.origin}/auth/callback`;
	return {}
})
$: console.log('Redirect path: ', redirectPath);
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>	

<div class="row flex-center flex">
	<div class="col-6 form-widget">

		<EmailAuthView
			supabaseClient={data.supabase}
			view={state}
			redirectTo={redirectPath}
			/>
		
			<div>Origin: {data.origin}</div>
			<div>Server URL: {data.server_url}</div>
	</div>
</div>

<style>
	.buttons {
		gap:0.25rem;
	}
</style>
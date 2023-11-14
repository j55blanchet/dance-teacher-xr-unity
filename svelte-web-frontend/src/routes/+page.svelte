<script lang="ts">
import { navbarProps } from "$lib/elements/NavBar.svelte";
import { onMount } from "svelte";
import { Auth } from '@supabase/auth-ui-svelte'
import { ThemeSupa, type ViewType } from '@supabase/auth-ui-shared'

export let data

onMount(() => {
	navbarProps.set({
		collapsed: true,
		pageTitle: "Login",
	});
});

let state = "sign_in" as ViewType;
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>	

<div class="row flex-center flex">
	<div class="col-6 form-widget">
		<h3>
			{#if state === "sign_in"}
				Sign In
			{:else if state === "sign_up"}
				Create Account
			{:else if state === "forgotten_password"}
				Password Reset
			{:else}
				{state}
			{/if}
		</h3>
		<Auth
			supabaseClient={data.supabase}
			view={state}
			redirectTo={`${data.url}/auth/callback`}
			showLinks={false}
			appearance={{ theme: ThemeSupa }}
		/>
		<div class="flex flex-col buttons">
			{#if state !== "sign_in"}
			<button class="link" on:click={() => state = "sign_in"}>Sign In</button>
			{/if}
			{#if state !== "sign_up"}
			<button class="link" on:click={() => state = "sign_up"}>Create Account</button>
			{/if}
			{#if state !== "forgotten_password"}
			<button class="link" on:click={() => state = "forgotten_password"}>Forgot Password</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.buttons {
		gap:0.25rem;
	}
</style>
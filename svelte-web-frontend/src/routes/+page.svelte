<script lang="ts">
import { navbarProps } from "$lib/elements/NavBar.svelte";
import MainMenuPage from "$lib/pages/MainMenuPage.svelte";
import { onMount } from "svelte";

onMount(() => {
	navbarProps.set({
		collapsed: true,
		pageTitle: "Home",
	});
});
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<MainMenuPage />
<script lang="ts">
import { navbarProps } from "$lib/elements/NavBar.svelte";
import MainMenuPage from "$lib/pages/MainMenuPage.svelte";
import { onMount } from "svelte";

    
onMount(() => {
    navbarProps.set({
        collapsed: false,
        pageTitle: "Main Menu",
    });
});

</script>

<svelte:head>
	<title>Dance Menu | DanceTeacher</title>
	<meta name="description" content="Dance sleection menu for the dance teacher app." />
</svelte:head>	

<div class="mainMenuPage">
    <MainMenuPage />
</div>

<style lang="scss">
.mainMenuPage {
    height: var(--content_height);
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
</style>
<script lang="ts">
	import type { Dance } from "$lib/data/dances-store.js";
	import { navbarProps } from "$lib/elements/NavBar.svelte";


    export let data;
    let dance: Dance;
    $: dance = data.dance;

    $: {
        navbarProps.update(props => ({
            ...props,
            collapsed: false,
            pageTitle: dance?.title,
            subtitle: `Dashboard`,
            back: {
                url: '/',
                title: 'Home',
            },
        }));
    }
</script>

<svelte:head>
    <title>{dance.title} Learning Dashboard</title>
    <meta name="description" content="App for learning the dance: {dance.title}" />
</svelte:head>

<div>
    <h1>{dance.title} Learning Dashboard</h1>
    <p>TODO: Add a dashboard for learning the dance: {dance.title}</p>
</div>
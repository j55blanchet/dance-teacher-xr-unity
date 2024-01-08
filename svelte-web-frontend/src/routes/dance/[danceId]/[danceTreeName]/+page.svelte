<script lang="ts">
	import type { Dance } from "$lib/data/dances-store.js";

	import { navbarProps } from "$lib/elements/NavBar.svelte";
	import type { PracticePlan } from "$lib/model/PracticePlan";
	import DanceLandingPage from "./DanceLandingPage.svelte";

    export let data;
    
    let dance: Dance;
    $: dance = data.dance;

    let practicePlan: PracticePlan;
    $: practicePlan = data.practicePlan;

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

<DanceLandingPage 
    {dance}    
    practicePlan={practicePlan}
/>
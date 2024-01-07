<script lang="ts">
    import DanceTreePage from "$lib/pages/DanceTreePage.svelte";
    import type { DanceTree, Dance } from '$lib/data/dances-store';
    import { navbarProps } from "$lib/elements/NavBar.svelte";
    
    export let data;
    let dance: Dance;
    let danceTree: DanceTree;
    let preselectedNodeId: string;
    
    $: dance = data.dance;
    $: {
        navbarProps.set({
            collapsed: false,
            pageTitle: `${dance.title} | Learning Journey Options`,
            back: {
                url: '/',
                title: 'Menu',
            },
        });
    }
</script>

<div>
    todo: display all potential segmentations for this dance.
</div>
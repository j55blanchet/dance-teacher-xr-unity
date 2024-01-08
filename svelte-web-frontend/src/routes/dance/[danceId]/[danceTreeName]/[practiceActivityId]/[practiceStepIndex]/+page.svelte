<script lang="ts">
    import { navbarProps } from "$lib/elements/NavBar.svelte";

    export let data;

    $: {
        navbarProps.update(props => ({
            ...props,
            collapsed: false,
            pageTitle: data.dance.title,
            subtitle: `Learning`,
            back: {
                url: '/dance/' + encodeURIComponent(data.dance.clipRelativeStem) + '/' + encodeURIComponent(data.danceTree.tree_name) + '/',
                title: `${data.dance.title} Home`,
            },
        }));
    }

</script>

<div>
    <h1>Practice Step</h1>
    
</div>
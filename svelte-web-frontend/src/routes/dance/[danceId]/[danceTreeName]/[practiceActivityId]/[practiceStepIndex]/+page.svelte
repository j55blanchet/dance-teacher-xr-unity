<script lang="ts">
    import { navbarProps } from "$lib/elements/NavBar.svelte";
	import PracticePage from "$lib/pages/PracticePage.svelte";

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

<div class="p-4">
    <PracticePage 
        dance={data.dance}    
        practiceStep={data.practiceStep}
        pageActive={true}
    />
</div>

<style>
    div {
        height: var(--content_height);
        width: 100%;
    }
</style>
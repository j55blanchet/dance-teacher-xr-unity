<script context="module" lang="ts">
// 
// Code in the script-level module is shared among all instances of NavBar 
// (which there should only be one of). It also gives child pages a way to 
// alter properties of the NavBar (such as the page title). They can do that
// by importing these writable stores (which are singletons, at the module level),
// and writing to them as needed (likely during `onMount`).
import { writable } from "svelte/store";

export type NavBarProps = {
    collapsed: boolean;
    pageTitle: string;
    back?: {
        url: string;
        title: string;
    };
}

export let navbarProps = writable<NavBarProps>({
    collapsed: true,
    pageTitle: 'LearnThatDance',
});
</script>

<nav class:collapsed={$navbarProps.collapsed}>
    <!-- Container for left-aligned content -->
    {#if $navbarProps.back}
        <a class="button" href={$navbarProps.back.url}>&lt; {$navbarProps.back.title}</a>
    {:else}
        <div></div>
    {/if}

    <!-- Container for centered content-->
    <h1>{$navbarProps.pageTitle}</h1>

    <!-- Container for right-aligned content-->
    <div></div>
</nav>

<style lang="scss">

nav {
    padding: 0 0.5em;
    box-sizing: border-box;
    height: var(--navbar_height);
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    background: rgba(0, 0, 0, .2);
    width: 100%;
    overflow: hidden;
    transition: height 0.2s ease-in-out;
}

nav.collapsed {
    height: 0;
}

nav h1 {
    margin: 0;
    padding: 0;
    font-size: 2rem;
}


</style>
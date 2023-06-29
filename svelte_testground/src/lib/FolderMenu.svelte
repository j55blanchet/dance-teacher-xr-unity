<script lang="ts" context="module">
export type FolderContents<D> = Array<MenuItem<D>>;
export type FolderMenuItem<D> = { type: 'folder', name: string, contents: FolderContents<D>, expanded: boolean};
export type FileMenuItem<D> = { 
    type: 'file', 
    name: string, 
    file: D,
    href?: string
};
export type MenuItem<D> = FileMenuItem<D> | FolderMenuItem<D>;
</script>
<script lang="ts">
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();
type T = $$Generic;

export let menuContents: FolderContents<T>;
export let selectedFile: T | null = null;

function fileSelected(file: T) {
    dispatch('fileSelected', file);
}

</script>

<ul>
    {#each menuContents as item}
        
        {#if item.type === 'folder'}
        <li class="folder">
            <details>
                <summary>{item.name}</summary>
                <svelte:self menuContents={item.contents} on:fileSelected {selectedFile}/>
            </details>
        </li>
        {:else}
        <li class="outlined thin file"
            class:selected={selectedFile === item.file}
            on:click={() => fileSelected(item.file)}>
            {#if item.href}
                <a href={item.href}>{item.name}</a>
            {:else}
                {item.name}
            {/if}
        </li>
        {/if}
    {/each}
</ul>

<style lang="scss">
    
ul li.selected {
    background-color: #dedede;
    box-shadow: 0 0 2px #000;
    scale: 1.04 1;
}

ul {
    margin-top: 0;
    padding: 0;
    text-align:left;
}

details > *:not(summary) {
    margin-left: 1em;
    padding-left: 1em;
    border-left: 1px solid #000;
}

ul li {
    list-style: none;
    padding: 0.25em 0.5em;
    scale: 1;
    transition: background-color 0.2s ease-in-out,
        box-shadow 0.2s ease-in-out
        scale 0.2s ease-in-out;
}

ul li:not(:last-child) {
    margin-bottom: 0.15em;
}

ul li.file:hover {
    cursor: pointer;
    background-color: #dedede;
    box-shadow: 0 0 2px #000;
    scale: 1.01 1;
}

</style>
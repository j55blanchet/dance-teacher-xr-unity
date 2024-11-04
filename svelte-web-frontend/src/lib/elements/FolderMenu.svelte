<script lang="ts" module>
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

import FolderMenu from './FolderMenu.svelte';
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();
type T = $$Generic;

interface Props {
    menuContents: FolderContents<T>;
    selectedFile?: T | null;
}

let { menuContents, selectedFile = null }: Props = $props();

function fileSelected(file: T): void {
    dispatch('fileSelected', file);
}

</script>

<ul class="mt-0 p-0 text-left">
    {#each menuContents as item}
        
        {#if item.type === 'folder'}
        <li class="folder">
            <details class="ml-4 pl-4 border-l border-black">
                <summary>{item.name}</summary>
                <FolderMenu menuContents={item.contents} on:fileSelected {selectedFile}/>
            </details>
        </li>
        {:else}
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <li class="outlined thin file list-none py-1 px-2 transition-all duration-200 ease-in-out hover:cursor-pointer hover:scale-101 hover:bg-gray-300 hover:shadow-sm"
            class:selected={selectedFile === item.file}
            >
            <a href={item.href}
               onclick={() => fileSelected(item.file)}>
                {item.name}
            </a>
            <!-- {#if item.href}
                <a href={item.href}>{item.name}</a>
            {:else}
                {item.name}
            {/if} -->
        </li>
        {/if}
    {/each}
</ul>
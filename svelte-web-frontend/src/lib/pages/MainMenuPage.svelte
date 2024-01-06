<script lang="ts">
import { debugMode__viewDanceMenuAsList } from '$lib/model/settings';
import { derived } from 'svelte/store';
import { dances, danceTrees, getThumbnailUrl, makeDanceTreeSlug, userVisibleDances } from '$lib/data/dances-store';
import type { DanceTree, Dance } from '$lib/data/dances-store';
import FolderMenu from '$lib/elements/FolderMenu.svelte';
import type { FolderContents, FolderMenuItem, FileMenuItem, MenuItem } from '$lib/elements/FolderMenu.svelte';
import { debugMode } from '$lib/model/settings';
import frontendPerformanceHistory from '$lib/ai/frontendPerformanceHistory';

import ClockIcon from 'virtual:icons/icon-park-outline/alarm-clock';
import ConfoundedFaceIcon from 'virtual:icons/icon-park-outline/confounded-face';
import DanceIcon from 'virtual:icons/mdi/human-female-dance';
import { getContext, onMount } from 'svelte';
import type { SupabaseClient } from '@supabase/supabase-js';

let menuData: FolderContents<Dance> = [];
const supabase = getContext('supabase') as SupabaseClient;

for(const dance of dances) {
    const path: string = dance.clipRelativeStem;
    const components = path.split('/');
    let currentMenuItem = null as FolderMenuItem<Dance> | null;

    for(let i = 0; i < components.length; i++) {
        const component = components[i];
        const isLastComponent = i === components.length - 1;

        if (isLastComponent && currentMenuItem) {
            currentMenuItem.contents.push({ type: 'file', name: dance.title, file: dance });
            break;
        } else if (isLastComponent) {
            menuData.push({ type: 'file', name: dance.title, file: dance });
        }

        // Create or find top-level menu item
        if (!currentMenuItem) {
            const matchingMenuItem = menuData.find(item => item.name === component);
            if (matchingMenuItem) {
                if (matchingMenuItem.type !== 'folder') {
                    throw new Error('Invalid menu item type (probably due to overlapping folder and file names) for path:' + path);
                }
                currentMenuItem = matchingMenuItem as FolderMenuItem<Dance>;
                continue;
            }
            currentMenuItem = { type: 'folder', name: component, contents: new Array(), expanded: false };
            menuData.push(currentMenuItem);
            continue;
        } 
        
        const matchingMenuItem = currentMenuItem.contents.find(item => item.name === component);

        // Create menu item for parent folder if needed
        if (!matchingMenuItem) {
            const newMenuItem: FolderMenuItem<Dance> = { type: 'folder', name: component, contents: new Array(), expanded: false };
            currentMenuItem.contents.push(newMenuItem);
            currentMenuItem = newMenuItem;
            continue
        } 

        if (matchingMenuItem?.type === 'folder') {
            currentMenuItem = matchingMenuItem;
            continue;
        } 
        throw new Error('Invalid menu item type (probably due to overlapping folder and file names) for path:' + path);
    }
}

let selectedDance: Dance | null = null;

let matchingDanceTrees: DanceTree[] = [];
let danceTreeMenuItems: FolderContents<DanceTree> = [];

let menuOptions = [];

// @ts-ignore
$: matchingDanceTrees = danceTrees[selectedDance?.clipRelativeStem] ?? [];
$: danceTreeMenuItems = matchingDanceTrees.map(function(tree: DanceTree) {
    return {
        type: 'file',
        name: tree.tree_name,
        file: tree,
        href: "/teachlesson/" + makeDanceTreeSlug(tree)
    } as FileMenuItem<DanceTree>
});

$: menuOptions = []
function toggleSelectDance(dance: Dance) {
    if (selectedDance === dance) {
        selectedDance = null;
    } else {
        selectedDance = dance;
    }
}

let perfHistoryStores = [] as ReturnType<typeof frontendPerformanceHistory.lastNAttemptsAllSegments<"skeleton3DAngleSimilarity">>[];

onMount(() => {
    perfHistoryStores = userVisibleDances.map(([dance, danceTree]) => frontendPerformanceHistory.lastNAttemptsAllSegments(
            dance.clipRelativeStem,
            'skeleton3DAngleSimilarity',
        )
    )
});
const perfHistoryAggregatedStore = derived(perfHistoryStores, (stores) => {
    return stores;
});

let danceTiles = [] as {dance: Dance, pageUrl: string}[];
$: danceTiles = userVisibleDances.map(([dance, danceTree]) => {
    return {
        dance,
        pageUrl: "/dance/" + encodeURIComponent(dance.clipRelativeStem) + "/",
        // pageUrl: "/teachlesson/" + makeDanceTreeSlug(danceTree)
    }
})
</script>

<section>
	<h1>
		Pick a dance to learn
	</h1>

    {#if $debugMode && $debugMode__viewDanceMenuAsList}
	<div class="cols">
		<div class="col dance-picking ta-center" style="max-width: 60ch;">
			<FolderMenu menuContents={menuData} 
				on:fileSelected={e => toggleSelectDance(e.detail)}
				selectedFile={selectedDance}
				/>
			<!-- <ul>
				{#each dances as dance (dance.clipRelativeStem)}
				<li class="outlined thin" 
					class:selected={dance === selectedDance}
					on:click={(event) => toggleSelectDance(dance)}>{dance.title}</li>
				{/each}
			</ul> -->
		</div>
		{#if selectedDance}
		<div class="col" style="max-width: 40ch;">
			<p>{selectedDance.title}</p>
			<FolderMenu menuContents={danceTreeMenuItems} />
			<!-- <ul>
				{#each danceTreeMenuItems as danceTree (danceTree.clip_relativepath)}
				<a href={"/teachlesson/" + makeDanceTreeSlug(danceTree)}><li class="outlined thin">{danceTree.tree_name}</li></a>
				{/each}
			</ul> -->
		</div>
		{/if}
	</div>
    {:else}
    <div class="tiles">
        {#each danceTiles as tileData, i (tileData.dance.clipRelativeStem)}
        <a class="tile" href={tileData.pageUrl}>
            <img class="thumbnail" src={getThumbnailUrl(supabase, tileData.dance)} alt={tileData.dance.title + " thumbnail"}>
            <div class="tile-details">
                <h3>{tileData.dance.title}</h3>
                <!-- <span class="detail duration" title="Duration"><span class="label"><ClockIcon /></span> {(danceTree.root.end_time - danceTree.root.start_time).toFixed(1)}s</span> -->
                <!-- <span class="detail complexity" title="Complexity"><span class="label"><ConfoundedFaceIcon /></span> {(danceTree.root.complexity / (danceTree.root.end_time - danceTree.root.start_time) * 100).toFixed(0)}&percnt;</span> -->

                <div class="detail">
                    <span class="label" title="Dance Attempts"><DanceIcon /></span>
                    <div class="performance-history">
                        {($perfHistoryAggregatedStore[i] ?? []).length} Repetitions
                    </div>
                </div>
            </div>
        </a>
        {/each}
    </div>
    {/if} 
	<!-- <Counter /> -->
</section>

<style lang="scss">
    section {
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
		// margin: 0 1rem;
	}
    .tiles {
        margin-bottom: 2rem;
        max-width: 100%;
        display: flex;
        flex-flow: row wrap;
        margin: 1rem;
        gap: 1rem;
        justify-content: center;
    }

    .tile {
        
        flex-grow: 1;
        max-width: calc(400px);
        position: relative;
        border-radius: 0.5rem;
        text-decoration: none;
        overflow: hidden;
        color: var(--color-text);
        display: flex;
        flex-direction: row;
        justify-content: left;

        background-color: rgba(255, 255, 255, 0.25);
        box-shadow: 0.2rem 0.2rem 0.5rem rgba(0, 0, 0, 0.25);
        
        transition: all 0.05s ease-out;

        & .thumbnail {
            align-self: center;
            height: 12rem;
            // min-height: 100%;
            // flex-grow: 1;
            object-fit: contain;
            // border-radius: 0.5rem;
        }

        & h3 {
            margin-top: 1rem;
        }
    }

    .tile:hover {
        background-color: rgba(245, 255, 245, 0.4);
        box-shadow: 0.15rem 0.15rem 0.6rem rgba(0, 0, 0, 0.4);
        color: var(--color-theme-1);
    }

    .tile-details {
        padding: 0 1.5rem 0rem 1.5rem;
        display: flex;
        flex-direction: column;
        justify-content: start;
        align-items: start;
        text-align: center;
        
        & .detail {
            display: flex;
            flex-direction: row;
            justify-content: start;
            align-items: center;
            gap: 0.5rem;
        }
        // transition: all 0.1s ease-in-out;
    }
	p {
		font-size: 1.1rem;
		margin-bottom: 0;
		padding: 0.25em 0.5em;
		
	}

    .links {
        flex-flow: row wrap;
        gap: 1em;
    }
</style>

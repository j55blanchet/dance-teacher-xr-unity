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

let selectedDance: Dance | null = $state(null);

let matchingDanceTrees: DanceTree[] = $state([]);
let danceTreeMenuItems: FolderContents<DanceTree> = $state([]);

let menuOptions = $state([]);

// @ts-ignore
$effect(() => {
    const clipStem = selectedDance?.clipRelativeStem;
    if (!clipStem) {
        matchingDanceTrees = [];
    }
    matchingDanceTrees = danceTrees[clipStem as keyof typeof danceTrees] ?? [];
});
$effect(() => {
        danceTreeMenuItems = matchingDanceTrees.map(function(tree: DanceTree) {
        return {
            type: 'file',
            name: tree.tree_name,
            file: tree,
            href: "/teachlesson/" + makeDanceTreeSlug(tree)
        } as FileMenuItem<DanceTree>
    });
});

    
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

let danceTiles = $state([] as {dance: Dance, pageUrl: string, oldPageUrl: string}[]);
$effect(() => {
    danceTiles = userVisibleDances.map(([dance, danceTree]) => {
        return {
            dance,
            pageUrl: `/dance/${encodeURIComponent(dance.clipRelativeStem)}/${encodeURIComponent(danceTree.tree_name)}/`,
            oldPageUrl: "/teachlesson/" + makeDanceTreeSlug(danceTree)
        }
    })
});
</script>

<section>
    {#if $debugMode && $debugMode__viewDanceMenuAsList}
	<div class="columns">
		<div class="column dance-picking ta-center" style="max-width: 60ch;">
			<FolderMenu menuContents={menuData} 
				on:fileSelected={(e:any) => { toggleSelectDance(e.detail); }}
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
		<div class="column" style="max-width: 40ch;">
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
    <div class="
        grid  grid-cols-[repeat(auto-fit,_minmax(18rem,1fr))]
        gap-4">
        {#each danceTiles as tileData, i (tileData.dance.clipRelativeStem)}
        <div class="daisy-card daisy-card-side bg-base-200 text-base-content shadow-xl" >
            <figure class="aspect-9/16 w-24">
                <img class="h-full w-full aspect-9/16" src={getThumbnailUrl(supabase, tileData.dance)} alt={tileData.dance.title + " thumbnail"}>
            </figure>
            <div class="daisy-card-body">
                <h2 class="daisy-card-title">{tileData.dance.title}</h2>
                <!-- <span class="detail duration" title="Duration"><span class="label"><ClockIcon /></span> {(danceTree.root.end_time - danceTree.root.start_time).toFixed(1)}s</span> -->
                <!-- <span class="detail complexity" title="Complexity"><span class="label"><ConfoundedFaceIcon /></span> {(danceTree.root.complexity / (danceTree.root.end_time - danceTree.root.start_time) * 100).toFixed(0)}&percnt;</span> -->
                    
                <!-- <div class="hidden performance-history flex align-center">
                    <span class="label" title="Dance Attempts"><DanceIcon /></span>
                    {($perfHistoryAggregatedStore[i] ?? []).length} Repetitions
                </div> -->
                <div class="grow"></div>
                
                <div class="daisy-card-actions justify-end">
                    <a href={tileData.pageUrl} class="daisy-btn daisy-btn-primary">Learn</a>
                </div>
            </div>
            
            
            
        </div>
        {/each}
    </div>
    {/if} 
	<!-- <Counter /> -->
</section>
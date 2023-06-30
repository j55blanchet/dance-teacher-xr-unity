<script lang="ts">
	import { dances, danceTrees, makeDanceTreeSlug } from '$lib/dances-store';
	import type { DanceTree, Dance } from '$lib/dances-store';
	import FolderMenu from '$lib/FolderMenu.svelte';
	import type { FolderContents, FolderMenuItem, FileMenuItem, MenuItem } from '$lib/FolderMenu.svelte';

	let menuData: FolderContents<Dance> = [];

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

	let matchingDanceTrees = [] as Array<DanceTree>;
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
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<h1>
		LearnThatDance 2.0
	</h1>
	
	<p>Try the <a href="/robot">robot control</a> test page.</p>
	
	<div class="cols">
		<div class="col dance-picking ta-center" style="max-width: 60ch;">
			<p>Pick a dance</p>
			
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
	
	<!-- <Counter /> -->
</section>

<style>
	section {
		width: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
		margin: 0 1rem;
	}
	p {
		font-size: 1.1rem;
		margin-bottom: 0;
		padding: 0.25em 0.5em;
		
	}
</style>

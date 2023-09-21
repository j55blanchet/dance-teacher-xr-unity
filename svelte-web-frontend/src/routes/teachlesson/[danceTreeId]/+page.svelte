<script lang="ts">
import DanceTreePage from "$lib/pages/DanceTreePage.svelte";
import type { DanceTree, Dance } from '$lib/data/dances-store';

/** @type {import('./$types').PageData} */    
export let data;
const dance: Dance = data.dance;
const danceTree: DanceTree = data.danceTree;

</script>

<DanceTreePage {dance} {danceTree} />

import { error } from '@sveltejs/kit';

import { getDanceAndDanceTreeFromDanceTreeId, findDanceTreeNode } from '$lib/dances-store.js';

import type { PageLoad } from './$types';


/** @type {import('./$types').PageLoad} */
export function load({ params })  {

    const danceTreeId: string = params.danceTreeId;
    const [dance, danceTree] = getDanceAndDanceTreeFromDanceTreeId(danceTreeId);

    if (!dance) {
        throw  error(404, 'Dance Not found');
    }
    if (!danceTree) {
        throw  error(404, 'Dance Tree Not found');   
    }

    const danceTreeNode = findDanceTreeNode(danceTree, params.practiceNodeId);

    return {
        dance: dance,
        danceTree: danceTree,
        danceTreeNode: danceTreeNode,
    }
}

export const prerender = false;
import { error } from '@sveltejs/kit';

import { getDanceAndDanceTreeFromDanceTreeId, findDanceTreeNode } from '$lib/data/dances-store.js';

/** @type {import('./$types').PageLoad} */
export async function load({ url, params })  {

    const playbackSpeedSearchParam = url.searchParams.get('playbackSpeed');

    let playbackSpeed = 'default' as 'default' | number;
    if (playbackSpeedSearchParam) {
        const parsedPlaybackSpeed = parseFloat(playbackSpeedSearchParam);
        if (!isNaN(parsedPlaybackSpeed)) {
            playbackSpeed = parsedPlaybackSpeed
        }
    }

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
        playbackSpeed: playbackSpeed,
    }
}

export const prerender = false;
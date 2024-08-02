import { error } from '@sveltejs/kit';

import { getDanceAndDanceTreeFromDanceTreeId, findDanceTreeNode } from '$lib/data/dances-store.js';
import { PracticeInterfaceModes } from '$lib/model/PracticeStep';

/** @type {import('./$types').PageLoad} */
export async function load({ url, params })  {

    const playbackSpeedSearchParam = url.searchParams.get('playbackSpeed');

    let playbackSpeed: number | undefined;
    if (playbackSpeedSearchParam) {
        const parsedPlaybackSpeed = parseFloat(playbackSpeedSearchParam);
        if (!isNaN(parsedPlaybackSpeed)) {
            playbackSpeed = parsedPlaybackSpeed
        }
    }

    let interfaceMode = url.searchParams.get('interfaceMode');
    if (!interfaceMode || Object.keys(PracticeInterfaceModes).indexOf(interfaceMode) === -1) {
        interfaceMode = 'bothVideos';
    }
    
    // Default to enabling terminal feedback.
    let terminalFeedbackEnabled = true;
    if (url.searchParams.get('terminalFeedbackEnabled') === `${false}`) {
        terminalFeedbackEnabled = false;
    }

    let showUserSkeleton = true;
    if (url.searchParams.get('showUserSkeleton') === `${false}`) {
        showUserSkeleton = false;
    }

    const danceTreeId: string = params.danceTreeId;
    const [dance, danceTree] = getDanceAndDanceTreeFromDanceTreeId(danceTreeId);

    if (!dance) {
        error(404, 'Dance Not found');
    }
    if (!danceTree) {
        error(404, 'Dance Tree Not found');   
    }

    const danceTreeNode = findDanceTreeNode(danceTree, params.practiceNodeId);

    return {
        dance,
        danceTree,
        danceTreeNode,
        playbackSpeed,
        interfaceMode,
        terminalFeedbackEnabled,
        showUserSkeleton,
    }
}

export const prerender = false;
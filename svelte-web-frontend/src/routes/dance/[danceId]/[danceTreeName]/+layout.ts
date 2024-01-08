import { error } from '@sveltejs/kit';

import { getDanceTreeFromDanceAndTreeName } from '$lib/data/dances-store.js';
import { GeneratePracticePlan } from '$lib/ai/TeachingAgent.js';

/** @type {import('./$types').PageLoad} */
export async function load({ params, parent })  {

    const { dance } = await parent();
    const danceTreeName: string = params.danceTreeName;
    const danceTree = getDanceTreeFromDanceAndTreeName(dance, danceTreeName);
    
    
    if (!danceTree) {
        throw  error(404, 'Dance Segmentation Not found');
    }

    const practicePlan = GeneratePracticePlan(dance, danceTree);
    
    // if (!danceTree) {
        // throw  error(404, 'Dance Tree Not found');   
    // }

    // const preselectedNodeId = url.searchParams.get('preselectedNodeId');

    return {
        // dance: dance,
        danceTree,
        practicePlan,
        // preselectedNodeId: preselectedNodeId,
    }
}

export const prerender = false;
export const trailingSlash = 'always'; // include trailing slash so that relative links work
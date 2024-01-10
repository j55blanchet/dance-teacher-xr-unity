import { error } from '@sveltejs/kit';

import { getDanceFromDanceId } from '$lib/data/dances-store.js';

/** @type {import('./$types').PageLoad} */
export function load({ params })  {

    const danceId: string = params.danceId;
    // const [dance, danceTree] = getDanceAndDanceTreeFromDanceTreeId(danceTreeId);
    const dance = getDanceFromDanceId(danceId);
    
    if (!dance) {
        throw  error(404, 'Dance Not found');
    }
    
    // if (!danceTree) {
        // throw  error(404, 'Dance Tree Not found');   
    // }

    // const preselectedNodeId = url.searchParams.get('preselectedNodeId');

    return {
        dance: dance,
        // danceTree: danceTree,
        // preselectedNodeId: preselectedNodeId,
    }
}

export const prerender = false;
export const trailingSlash = 'always'; // include trailing slash so that relative links work
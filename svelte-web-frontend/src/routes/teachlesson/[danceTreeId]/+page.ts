import { error } from '@sveltejs/kit';

import { getDanceAndDanceTreeFromDanceTreeId } from '$lib/data/dances-store.js';

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

    return {
        dance: dance,
        danceTree: danceTree
    }
}

export const prerender = false;
export const trailingSlash = 'always'; // include trailing slash so that relative links work
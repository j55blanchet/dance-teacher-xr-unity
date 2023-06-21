import { error } from '@sveltejs/kit';

import { getDanceAndDanceTreeFromSlog } from '$lib/dances-store.js';

export function load({ params }) {

    const [dance, danceTree] = getDanceAndDanceTreeFromSlog(params.slug);

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
import { error } from '@sveltejs/kit';

import { getDanceAndDanceTreeFromSlog } from '$lib/dances-store.js';

import type { PageLoad } from './$types';

/** @type {import('./$types').PageLoad} */
export function load({ params })  {

    const slug: string = params.slug;
    const [dance, danceTree] = getDanceAndDanceTreeFromSlog(slug);

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
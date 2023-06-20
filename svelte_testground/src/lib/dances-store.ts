import { readable, writable } from 'svelte/store';

// import json data
import dancesData from '$lib/data/dances.json';
import danceTreeData from '$lib/data/dancetrees.json';

export const dances = readable(
    dancesData,
    function start(set) {
        return function stop(){
        }
    }
);

export const danceTrees = readable(
    danceTreeData,
    function start(set) {
        return function stop(){
        }
    }
);


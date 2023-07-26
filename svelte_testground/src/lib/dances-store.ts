import { readable, writable, derived } from 'svelte/store';

// import json data
import dancesData from '$lib/data/bundle/dances.json';
import danceTreeData from '$lib/data/bundle/dancetrees.json';

export type Dance = typeof dancesData[0];
export type DanceTreeDict = typeof danceTreeData;
export type ValueOf<T> = T[keyof T];
export type DanceTrees = ValueOf<DanceTreeDict>;
export type DanceTree = DanceTrees[0];
export type DanceTreeNode = DanceTree["root"];

export const dances = dancesData.sort((a: Dance, b: Dance) => a.clipPath.localeCompare(b.clipRelativeStem));
// readable(
//     dancesData,
//     function start(set) {
//         return function stop(){
//         }
//     }
// );

export const danceTrees = danceTreeData;
// readable(
//     danceTreeData,
//     function start(set) {
//         return function stop(){
//         }
//     }
// );




const URI_COMPONENT_SEPARATOR = '___';

export function makeDanceTreeSlug(danceTree: DanceTree): string {
    return encodeURIComponent(`${danceTree.clip_relativepath}${URI_COMPONENT_SEPARATOR}${danceTree.tree_name}`)
}

export function getDanceAndDanceTreeFromSlog(slug: string): [Dance | null, DanceTree | null] {
    const [clipRelativeStem, tree_name] = decodeURIComponent(slug).split(URI_COMPONENT_SEPARATOR);
    // @ts-ignore
    const matchingDance: Dance | null = dances.find((dance) => dance.clipRelativeStem === clipRelativeStem) ?? null;
    // @ts-ignore
    const matchingDanceTrees: DanceTrees = danceTrees[clipRelativeStem] ?? []
    const matchingDanceTree = matchingDanceTrees.find(danceTree => danceTree.tree_name === tree_name) ?? null;    
    return [matchingDance, matchingDanceTree];
    
}

export function getDanceVideoSrc(dance: Dance): string {
    return `/bundle/videos/${dance.clipPath}`;
}
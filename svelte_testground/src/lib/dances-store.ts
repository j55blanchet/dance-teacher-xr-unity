import { readable, writable, derived } from 'svelte/store';
import Papa from 'papaparse';

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

export function getHolisticDataSrc(dance: Dance): string {
    return `/bundle/holisticdata/${dance.clipRelativeStem}.holisticdata.csv`;
}
export function get2DPoseDataSrc(dance: Dance): string {
    return `/bundle/pose2d/${dance.clipRelativeStem}.pose2d.csv`
}


type PoseInformation = any;
/**
 * Get the pose information for a dance. This is a CSV file with the pose information for 
 * each frame of the dance. It's returned in the form of an array of objects, where each object
 * is a frame of the dance, with keys corresponding to column names in the CSV file.
 * 
 * Example: 
 * ```
 * [{
 *  "frame": 0,
 *   "NOSE_x": 0.12,
 *   "NOSE_y": 0.34,
 *   "NOSE_z": 0.56,
 *    NOSE_vis": 0.98,
 *    "LEFT_EYE_INNER_x": 0.12,
 *    ...
 * },
 * ...]
 * ```
 * 
 * @param dance The dance to load the pose information for
 * @returns The pose information for the dance
 */
export async function loadPoseInformation(dance: Dance): Promise<PoseInformation> {
    const poseCsvPath = get2DPoseDataSrc(dance);
    const response = await fetch(poseCsvPath);
    const text = await response.text();

    // parse csv file
    const data = await new Promise((res, rej) => {       
        Papa.parse(text, {
            header: true,
            worker: true,
            // download: true,
            dynamicTyping: true,
            complete: res,
        })
    });

    return data as PoseInformation;
}

export function getDancePose(dance: Dance, poseInformation: PoseInformation, time: number) {
    
    const frameIndex = Math.floor(time * dance.fps);
    return poseInformation[frameIndex] ?? null
}

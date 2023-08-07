import { readable, writable, derived } from 'svelte/store';
import Papa from 'papaparse';

import { PoseLandmarkKeysUpperSnakeCase , type Pose2DPixelLandmarks } from '$lib/mediapipe-utils';

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

/**
 * Constrain a value to a given range
 * @param val Value to constrain
 * @param min Minimum value
 * @param max Maximum value
 * @returns Constrained value
 */
function constrain(val: number, min: number, max: number) {
    return Math.min(Math.max(val, min), max);
}

/**
 * Reference data for a dance, in the form of an array of 2D pose landmarks for each frame of the dance.
 */
export class Pose2DReferenceData {
    
    /**
     * Create a new Pose2DReferenceData object
     * @param fps Frames per second of the reference data
     * @param frameIndices Frame indices of the reference data (as some frames may be missing)
     * @param poses 2D pose landmarks for each frame of the reference data
     */
    constructor(
        private fps: number, 
        private frameIndices: number[],
        private poses: Pose2DPixelLandmarks[]
    ) {
    }

    /**
     * Get the reference pose information for a given time in the dance.
     * @param timestamp Dance timestamp of the frame to get the pose for
     * @returns Pose information for the frame at the given timestamp, or null if no pose information is available for that frame
     */
    getReferencePoseAtTime(timestamp: number): Pose2DPixelLandmarks | null {

        let targetFrameIndex = Math.floor(timestamp * this.fps);

        // Starting at the estimated frame, search backward for the closest frame with pose information. 
        //   * We're making the assumption that the data may omit frames, but does not contain any duplicate frames. 
        //     Therefore, we can search backward from the estimated frame to find the closest frame with pose information.
        let searchIndex = constrain(targetFrameIndex, 0, this.frameIndices.length - 1);
        
        while(this.frameIndices[searchIndex] > targetFrameIndex && searchIndex > 0) {
            searchIndex--;
        }

        // const frameIndex = this.frameIndices[searchIndex];
        const pose = this.poses[searchIndex];

        return pose;
    }
}

type Pose2DCSV = any;
type Pose2DCSVRow = any;
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
export async function loadPoseInformation(dance: Dance): Promise<Pose2DReferenceData> {
    const poseCsvPath = get2DPoseDataSrc(dance);
    const response = await fetch(poseCsvPath);
    const text = await response.text();

    // parse csv file
    const data: any = await new Promise((res, rej) => {       
        Papa.parse(text, {
            header: true,
            worker: true,
            // download: true,
            dynamicTyping: true,
            complete: res,
        })
    });

    // convert to array of pose information
    return new Pose2DReferenceData(
        dance.fps, 
        data.data.map((row: any) => +row[`frame`]), 
        data.data.map((row: any) => GetPixelLandmarksFromPose2DRow(row))
    )
}

function GetPixelLandmarksFromPose2DRow(pose2drow: any): Pose2DPixelLandmarks | null {
    if (!pose2drow) return null;

    return PoseLandmarkKeysUpperSnakeCase.map((key, i) => {
        return {
            x: pose2drow[`${key}_x`],
            y: pose2drow[`${key}_y`],
            dist_from_camera: pose2drow[`${key}_distance`],
            visibility: pose2drow[`${key}_vis`]
        }
    });
}

export function getDancePose(dance: Dance, poseInformation: Pose2DCSV, time: number): null | Pose2DPixelLandmarks {
    
    const frameIndex = Math.floor(time * dance.fps);
    const csvRowData = poseInformation.data[frameIndex] ?? null
    return GetPixelLandmarksFromPose2DRow(csvRowData);
}

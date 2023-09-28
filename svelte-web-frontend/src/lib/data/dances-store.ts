import Papa, { type ParseResult } from 'papaparse';

import { PoseLandmarkKeysUpperSnakeCase , type Pose2DPixelLandmarks, type Pose3DLandmarkFrame } from '$lib/webcam/mediapipe-utils';

// import json data
import dancesData from '$lib/data/bundle/dances.json';
import danceTreeData from '$lib/data/bundle/dancetrees.json';

export type Dance = typeof dancesData[0];
export type DanceTreeDict = typeof danceTreeData;
export type ValueOf<T> = T[keyof T];
export type DanceTrees = ValueOf<DanceTreeDict>;
export type DanceTree = DanceTrees[0];
export type DanceTreeNode = DanceTree["root"];

export const dances = dancesData.sort((a: Dance, b: Dance) => a.clipRelativeStem.localeCompare(b.clipRelativeStem));
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

export function getDanceAndDanceTreeFromDanceTreeId(slug: string): [Dance | null, DanceTree | null] {
    const [clipRelativeStem, tree_name] = decodeURIComponent(slug).split(URI_COMPONENT_SEPARATOR);
    
    const matchingDance: Dance | null = dances.find((dance) => dance.clipRelativeStem === clipRelativeStem) ?? null;

    const matchingDanceTrees: DanceTrees = danceTrees[clipRelativeStem as keyof typeof danceTrees] ?? []
    const matchingDanceTree = matchingDanceTrees.find(danceTree => danceTree.tree_name === tree_name) ?? null;    
    return [matchingDance, matchingDanceTree];
    
}

function FindDanceTreeNodeRecursive(node: DanceTreeNode, nodeId: string): DanceTreeNode | null {
    for (const child of node.children) {
        if (child.id === nodeId) {
            return child as unknown as DanceTreeNode;
        }
        const foundNode = FindDanceTreeNodeRecursive(child as unknown as DanceTreeNode, nodeId);
        if (foundNode) {
            return foundNode;
        }
    }
    return null;
}

export function findDanceTreeNode(danceTree: DanceTree, nodeId: string): DanceTreeNode | null {
    if (danceTree.root.id === nodeId) {
        return danceTree.root;
    }
    return FindDanceTreeNodeRecursive(danceTree.root, nodeId);
}

export function getAllLeafNodes(node: DanceTreeNode): DanceTreeNode[] {
    if (node.children.length === 0) {
        return [node];
    }

    return [
        ...node.children.flatMap((child) => getAllLeafNodes(child as unknown as DanceTreeNode))
    ];   
}

export function getAllNodes(node: DanceTreeNode): DanceTreeNode[] {
    return [
        node,
        ...node.children.flatMap((child) => getAllNodes(child as unknown as DanceTreeNode))
    ];   
}

export function getDanceVideoSrc(dance: Dance): string {
    return `/bundle/source_videos/${dance.clipPath}`;
}

export function getHolisticDataSrc(dance: Dance): string {
    return `/bundle/holistic_data/${dance.clipRelativeStem}.holisticdata.csv`;
}
export function get2DPoseDataSrc(dance: Dance): string {
    return `/bundle/pose2d_data/${dance.clipRelativeStem}.pose2d.csv`
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
export class PoseReferenceData<T extends Pose2DPixelLandmarks | Pose3DLandmarkFrame> {
    
    /**
     * Create a new Pose2DReferenceData object
     * @param fps Frames per second of the reference data
     * @param frameIndices Frame indices of the reference data (as some frames may be missing)
     * @param poses 2D pose landmarks for each frame of the reference data
     */
    constructor(
        private fps: number, 
        private frameIndices: number[],
        private poses: T[]
    ) {
    }

    /**
     * Get the reference pose information for a given time in the dance.
     * @param timestamp Dance timestamp of the frame to get the pose for
     * @returns Pose information for the frame at the given timestamp, or null if no pose information is available for that frame
     */
    getReferencePoseAtTime(timestamp: number): T | null {

        const targetFrameIndex = Math.floor(timestamp * this.fps);

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

async function loadPoseInformation<T extends Pose2DPixelLandmarks | Pose3DLandmarkFrame>(csvpath: string, fps: number, rowToPose: (row: Record<string, number>) => T | null) {
    const response = await fetch(csvpath);
    const text = await response.text();
    const data: ParseResult<Record<string, never>> = await new Promise((res, rej) => {       
        Papa.parse(text, {
            header: true,
            worker: true,
            // download: true,
            dynamicTyping: true,
            complete: res,
            error: rej,
        })
    });

    // convert to array of pose information
    return new PoseReferenceData(
        fps, 
        data.data.map((row) => +row[`frame`]), 
        data.data.map((row) => rowToPose(row))
                        .filter((pose) => pose !== null) as T[]
    )
}

/**
 * Get the 2d pose information for a dance. It downloads a CSV file with the pose2d data, then converts
 * the data into a 2d pixel landmark format
 * @param dance The dance to load the pose information for
 * @returns The pose information for the dance
 */
export async function load2DPoseInformation(dance: Dance): Promise<PoseReferenceData<Pose2DPixelLandmarks>> {
    const pose2dCsvPath = get2DPoseDataSrc(dance);
    return await loadPoseInformation(pose2dCsvPath, dance.fps, GetPixelLandmarksFromPose2DRow);
}

/**
 * Get the 3d pose information for a dance. It downloads a CSV file with the holistic data, then converts
 * the data into the 3d landmark format that mediapipe uses (but with the added visiblity component that as
 * of 2023-09-18 is only present in the python solution).
 * @param dance The dance to load the pose information for
 * @returns The pose information for the dance.
 */
export async function load3DPoseInformation(dance: Dance): Promise<PoseReferenceData<Pose3DLandmarkFrame>> {
    const pose3dCsvPath = getHolisticDataSrc(dance);
    return await loadPoseInformation(pose3dCsvPath, dance.fps, GetPixelLandmarksFromPose3DRow);
}

function GetPixelLandmarksFromPose2DRow(pose2drow: Record<string, number>) {
    if (!pose2drow) return null;

    return PoseLandmarkKeysUpperSnakeCase.map((key) => {
        return {
            x: pose2drow[`${key}_x`],
            y: pose2drow[`${key}_y`],
            dist_from_camera: pose2drow[`${key}_distance`],
            visibility: pose2drow[`${key}_vis`]
        }
    });
}

function GetPixelLandmarksFromPose3DRow(pose3drow: Record<string, number>) {
    if (!pose3drow) return null;
    
    return PoseLandmarkKeysUpperSnakeCase.map((key) => {
        return {
            x: pose3drow[`${key}_x`],
            y: pose3drow[`${key}_y`],
            z: pose3drow[`${key}_z`],
            vis: pose3drow[`${key}_vis`]
        }
    });
}

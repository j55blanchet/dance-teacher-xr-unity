import study1CsvUrl from './testdata/user1-seg-ratings.csv?url';
import study2CsvUrl from './testdata/user2-seg-ratings.csv?url';
import Papa from 'papaparse';
import { readFile, readdir } from 'node:fs/promises';
import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from '$lib/webcam/mediapipe-utils';

export const STUDY_1_POSES_FOLDER = "../motion-pipeline/data/study-poses/user-study-1-segmented-poses/";
export const STUDY_2_POSES_FOLDER = "../motion-pipeline/data/study-poses/user-study-2-segmented-poses-take3-beataligned-spedup-poses/";


export const LandmarkNames = ['NOSE', 'LEFT_EYE_INNER', 'LEFT_EYE', 'LEFT_EYE_OUTER', 'RIGHT_EYE_INNER', 'RIGHT_EYE', 'RIGHT_EYE_OUTER', 'LEFT_EAR', 'RIGHT_EAR', 'MOUTH_LEFT', 'MOUTH_RIGHT', 'LEFT_SHOULDER', 'RIGHT_SHOULDER', 'LEFT_ELBOW', 'RIGHT_ELBOW', 'LEFT_WRIST', 'RIGHT_WRIST', 'LEFT_PINKY', 'RIGHT_PINKY', 'LEFT_INDEX', 'RIGHT_INDEX', 'LEFT_THUMB', 'RIGHT_THUMB', 'LEFT_HIP', 'RIGHT_HIP', 'LEFT_KNEE', 'RIGHT_KNEE', 'LEFT_ANKLE', 'RIGHT_ANKLE', 'LEFT_HEEL', 'RIGHT_HEEL', 'LEFT_FOOT_INDEX', 'RIGHT_FOOT_INDEX'];

export enum Study {
    Study1 = "study1",
    Study2 = "study2",
}

export type SegmentInfo = {
    userId: number;
    danceName: string;
    workflowId: string;
    condition: string;
    clipNumber: number;
    study1phase?: string;
}

export type PoseFrame = {
    pixelPose: Pose2DPixelLandmarks, 
    worldPose: Pose3DLandmarkFrame
};

/**
 * Given a filename in the study 2 format, extract the segment info
 * @param filename The filename of the poses file
 * @returns The segment info, or null if the filename is not in the expected format
 * 
 * @example
 * With a study 1 filename like `"user4324____initial____userstudy1--last-christmas--control____workflowid-0079b262-7575-4ae7-a377-60e21070106e____clip1.pose.csv"`
 * It will return
 * ```
 * {
 *   userId: 4324,
 *   danceName: "last-christmas",
 *   condition:"control",
 *   workflowId: "0079b262-7575-4ae7-a377-60e21070106e",
 *   clipNumber: 1,
 * }
 * ```
 * 
 * @example
 * With a study 2 filename like `"user3209________userstudy2-bartender-segmented____workflowid-c096aef4-3cd9-415d-9ca1-f8709a7f770a____clip1.pose.csv"`
 * It will return
 * ```
 * {
 *  userId: 3209,
 *  danceName: "bartender",
 *  condition: "segmented",
 *  workflowId: "c096aef4-3cd9-415d-9ca1-f8709a7f770a",
 *  clipNumber: 1,
 * }
 * ```
 */
export function getSegmentInfo(filename: string, study: Study): SegmentInfo | null {
    const targetPartCount = study === Study.Study1 ? 5 : 4;
    const conditionSeparator = study === Study.Study1 ? "--" : "-";

    let fileparts = filename.split("_").filter((s) => s.length > 0);
    if (fileparts.length !== targetPartCount) return null;

    let study1phase = undefined;
    if (study === Study.Study1) {
        // extract the study 1 phase
        study1phase = fileparts.splice(1, 1)[0];
    }
    // Format (for either study case) is now [user, dance-condition, workflow, clip]

    let [userPart, danceConditionPart, workflowPart, clipPart] = fileparts;
    userPart = userPart.replace("user", "");
    let userId = Number.parseInt(userPart);
    if (Number.isNaN(userId)) return null;
    
    let [studyName, danceName, condition] = danceConditionPart.split(conditionSeparator);
    let workflowId = workflowPart.replace("workflowid-", "");
    let clipNumber = Number.parseInt(clipPart.replace("clip", "").replace(".pose.csv", ""));
    if (Number.isNaN(clipNumber)) return null;
    return {
        userId,
        danceName,
        workflowId,
        condition,
        clipNumber,
        study1phase,
    };
}

function convertCsvRow(row: Record<string, number>): PoseFrame {
    const user2dPose: Pose2DPixelLandmarks = LandmarkNames.map((name) => {
        return {
            x: row[`${name}_x_2d`],
            y: row[`${name}_y_2d`],
            dist_from_camera: row[`${name}_z_2d`],
            visibility: row[`${name}_visibility_2d`],
        }
    })

    const user3dPose: Pose3DLandmarkFrame = LandmarkNames.map((name) => {
        return {
            x: row[`${name}_x_3d`],
            y: row[`${name}_y_3d`],
            z: row[`${name}_z_3d`],
            visibility: row[`${name}_visibility_3d`],
        }
    })

    return {
        pixelPose: user2dPose,
        worldPose: user3dPose,
    }
}

/**
 * Generates all pose files in a folder
 * @param folder L
 * @param study 
 */
export async function* loadPoses(folder: string, study: Study): AsyncGenerator<Array<PoseFrame>> {
    // List all files in the folder
    const files = await readdir(folder);

    for (const file of files) {
        const segmentInfo = getSegmentInfo(file, study);
        if (segmentInfo == null) continue;
        const fullpath = `${folder}/${file}`;

        const data = await readFile(fullpath, 'utf-8');

        yield await new Promise((res, rej) => {
            Papa.parse(data, {
                header: true,
                dynamicTyping: true,
                complete: (results) => {
                    const convertedFrames = (results.data as Array<Record<string, number>>).map(convertCsvRow);
                    res(convertedFrames);
                },
                error: (error: Error, file: Papa.LocalFile) => {
                    rej(error);
                }
            })
        });
    }
}
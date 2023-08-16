import type { Landmark, NormalizedLandmark, PoseLandmarkerResult } from '@mediapipe/tasks-vision'
import { SwapMultipleArrayElements } from '$lib/utils/array';
import type { ValueOf } from '$lib/dances-store';

export const PoseLandmarkIds = Object.freeze({
    nose: 0,
    leftEyeInner: 1,
    leftEye: 2,
    leftEyeOuter: 3,
    rightEyeInner: 4,
    rightEye: 5,
    rightEyeOuter: 6,
    leftEar: 7,
    rightEar: 8,
    mouthLeft: 9,
    mouthRight: 10,
    leftShoulder: 11,
    rightShoulder: 12,
    leftElbow: 13,
    rightElbow: 14,
    leftWrist: 15,
    rightWrist: 16,
    leftPinky: 17,
    rightPinky: 18,
    leftIndex: 19,
    rightIndex: 20,
    leftThumb: 21,
    rightThumb: 22,
    leftHip: 23,
    rightHip: 24,
    leftKnee: 25,
    rightKnee: 26,
    leftAnkle: 27,
    rightAnkle: 28,
    leftHeel: 29,
    rightHeel: 30,
    leftFootIndex: 31,
    rightFootIndex: 32,
});
export type PoseLandmarkIndex = ValueOf<typeof PoseLandmarkIds>;
type PoseLandmarkName = keyof typeof PoseLandmarkIds;
export const PoseLandmarkKeys = Object.freeze(Object.getOwnPropertyNames(PoseLandmarkIds)) as readonly PoseLandmarkName[];

export type Pose3DLandmarks = PoseLandmarkerResult["worldLandmarks"];
export type Pose2DNormalizedLandmarks = PoseLandmarkerResult["landmarks"]
export type AnyLandmark = NormalizedLandmark | Landmark | PixelLandmark;

/**
 * Represents a pixel landmark
 */
type PixelLandmark = {
    x: number;
    y: number;
    dist_from_camera: number;
    visibility: number;
}
export type Pose2DPixelLandmarks = PixelLandmark[]


// export function Get3DLandmarksFromHolisticRow(holisticRow: any): Pose3DLandmarks {
//     return [];
// }

/**
 * Convert a string from camelCase to snake_case
 * @param camelCaseString A string in camelCase, like "leftShoulder"
 * @returns A string in snake_case, like "left_shoulder"
 */
function convertCamelcaseStringToSnakeCase(camelCaseString: string): string {
    return camelCaseString
        // Add an underscore before all capital letters 
        // (other than one occuring as the first character)
        .replace(
            /(?<!^)[A-Z]/g, 
            (letter) => `_${letter.toLowerCase()}`
        )
  }

export const PoseLandmarkKeysUpperSnakeCase = Object.freeze(PoseLandmarkKeys.map(k => convertCamelcaseStringToSnakeCase(k).toUpperCase()));

export function SwapLeftRightLandmarks<T extends AnyLandmark>(pose: T[]) {
    const copiedPose = [...pose]
    SwapMultipleArrayElements(copiedPose, [
        [PoseLandmarkIds.leftEyeInner, PoseLandmarkIds.rightEyeInner],
        [PoseLandmarkIds.leftEye, PoseLandmarkIds.rightEye],
        [PoseLandmarkIds.leftEyeOuter, PoseLandmarkIds.rightEyeOuter],
        [PoseLandmarkIds.leftEar, PoseLandmarkIds.rightEar],
        [PoseLandmarkIds.mouthLeft, PoseLandmarkIds.mouthRight],
        [PoseLandmarkIds.leftShoulder, PoseLandmarkIds.rightShoulder],
        [PoseLandmarkIds.leftElbow, PoseLandmarkIds.rightElbow],
        [PoseLandmarkIds.leftWrist, PoseLandmarkIds.rightWrist],
        [PoseLandmarkIds.leftPinky, PoseLandmarkIds.rightPinky],
        [PoseLandmarkIds.leftIndex, PoseLandmarkIds.rightIndex],
        [PoseLandmarkIds.leftThumb, PoseLandmarkIds.rightThumb],
        [PoseLandmarkIds.leftHip, PoseLandmarkIds.rightHip],
        [PoseLandmarkIds.leftKnee, PoseLandmarkIds.rightKnee],
        [PoseLandmarkIds.leftAnkle, PoseLandmarkIds.rightAnkle],
        [PoseLandmarkIds.leftHeel, PoseLandmarkIds.rightHeel],
        [PoseLandmarkIds.leftFootIndex, PoseLandmarkIds.rightFootIndex],
    ]);
    return copiedPose;
}

export function MirrorXNormalizedPose<T extends AnyLandmark>(pose: T[]): T[] {
    const xFlipped = pose.map(lm => ({
        ...lm,
        x: 1 - lm.x,
    }));

    return SwapLeftRightLandmarks(xFlipped);
}

export function GetPixelLandmarksFromNormalizedLandmarks(normalizedLandmarks: NormalizedLandmark[], srcWidth: number, srcHeight: number): Pose2DPixelLandmarks | null {
    if ((normalizedLandmarks?.length ?? 0) <= 0) return null;
    
    return normalizedLandmarks.map((lm, i) => ({
        x: lm.x * srcWidth,
        y: lm.y * srcHeight,
        dist_from_camera: lm.z * srcWidth,
        visibility: (lm as any)["visibility"] ?? 1.0,
    }));
}

export function GetNormalizedLandmarksFromPixelLandmarks(
    pixelLandmarks: Pose2DPixelLandmarks,
    srcWidth: number,
    srcHeight: number,
): NormalizedLandmark[] {
    return pixelLandmarks.map(lm => ({
        x: lm.x / srcWidth,
        y: lm.y / srcHeight,
        z: lm.dist_from_camera / srcWidth,
        visibility: lm.visibility,
    }));
}
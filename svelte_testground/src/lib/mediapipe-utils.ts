import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision'

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
type PoseLandmarkName = keyof typeof PoseLandmarkIds;
export const PoseLandmarkKeys = Object.freeze(Object.getOwnPropertyNames(PoseLandmarkIds)) as readonly PoseLandmarkName[];

export type Pose3DLandmarks = PoseLandmarkerResult["worldLandmarks"];
export type Pose2DNormalizedLandmarks = PoseLandmarkerResult["landmarks"]

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

const PoseLandmarkKeysUppercase = Object.freeze(PoseLandmarkKeys.map(k => k.toUpperCase()));

export function GetPixelLandmarksFromPose2DRow(pose2drow: any): Pose2DPixelLandmarks | null {
    if (!pose2drow) return null;

    return PoseLandmarkKeysUppercase.map((key, i) => {
        return {
            x: pose2drow[`${key}_x`],
            y: pose2drow[`${key}_y`],
            dist_from_camera: pose2drow[`${key}_distance`],
            visibility: pose2drow[`${key}_vis`]
        }
    });
}

export function GetPixelLandmarksFromMPResult(result: PoseLandmarkerResult, srcWidth: number, srcHeight: number): Pose2DPixelLandmarks | null {
    if (result?.landmarks?.length ?? 0 <= 0) return null;
    
    const firstDetectedPerson = result.landmarks[0];
    
    return firstDetectedPerson.map((lm, i) => ({
        x: lm.x,
        y: lm.y,
        dist_from_camera: lm.z,
        visibility: (lm as any)["visibility"] ?? 1.0,
    }));
}
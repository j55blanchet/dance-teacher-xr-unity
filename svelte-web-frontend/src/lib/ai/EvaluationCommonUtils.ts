import type { TerminalFeedbackBodyPart, TerminalFeedbackBodyPartIndex } from "$lib/model/TerminalFeedback";
import {PoseLandmarkIds, type PoseLandmarkIndex, type Pose2DPixelLandmarks, PoseLandmarkKeys } from  "$lib/webcam/mediapipe-utils";

/**
 * Calculate a scale indicator for a set of 2D pose landmarks. The size of people in pixels
 * can vary greatly, so we need to standardize the measurements based on the user's body size.
 * The function computes a scale indicator based on the heights of the torso and shoulder width.
 * This is used to standardize measurements based on the user's body size in the reference space.
 * @param pixelLandmarks - 2D pixel coordinates of pose landmarks
 * @returns Scale indicator value
 */
export function GetScaleIndicator(pixelLandmarks: Pose2DPixelLandmarks){

    // Calculate torso heights and shoulder width
    const leftTorsoHeight = getMagnitude(GetVector(pixelLandmarks, PoseLandmarkIds.leftShoulder, PoseLandmarkIds.leftHip))
    const rightTorsoHeight = getMagnitude(GetVector(pixelLandmarks, PoseLandmarkIds.rightShoulder, PoseLandmarkIds.rightHip))
    const shoulderWidth = getMagnitude(GetVector(pixelLandmarks, PoseLandmarkIds.leftShoulder, PoseLandmarkIds.rightShoulder))
    
    // Combine the measurements to compute the scale indicator
    return 0.25 * leftTorsoHeight + 
           0.25 * rightTorsoHeight +
           0.5 * shoulderWidth
}

/**
 * Definition of comparison vectors for the Qijia method.
 * These vectors represent pairs of pose landmarks used for similarity calculations.
 */
export const QijiaMethodComparisonVectors: Readonly<Array<[PoseLandmarkIndex, PoseLandmarkIndex]>> = Object.freeze([
    [PoseLandmarkIds.leftShoulder,  PoseLandmarkIds.rightShoulder],
    [PoseLandmarkIds.leftShoulder,  PoseLandmarkIds.leftHip],
    [PoseLandmarkIds.leftHip,       PoseLandmarkIds.rightHip],
    [PoseLandmarkIds.rightHip,      PoseLandmarkIds.rightShoulder],
    [PoseLandmarkIds.leftShoulder,  PoseLandmarkIds.leftElbow],
    [PoseLandmarkIds.leftElbow,     PoseLandmarkIds.leftWrist],
    [PoseLandmarkIds.rightShoulder, PoseLandmarkIds.rightElbow],
    [PoseLandmarkIds.rightElbow,    PoseLandmarkIds.rightWrist]
])

/**
 * Names of the comparison vectors for the Qijia method.
 * These names are generated based on the landmark IDs.
 */
export const QijiaMethodComparisionVectorNames = QijiaMethodComparisonVectors.map((vec) => {
    const [lmSrc, lmDest] = vec;
    const [srcName, destName] = [PoseLandmarkKeys[lmSrc], PoseLandmarkKeys[lmDest]];
    const key = `${srcName} -> ${destName}`
    return key;
});

// Mapping of comparison vector names to their index in the comparison vectors array.
export const QijiaMethodComparisionVectorNamesToIndexMap = new Map(QijiaMethodComparisionVectorNames.map((name, i) => [name, i]))

/**
 * Map that associates comparison vector indices to terminal feedback body parts.
 * Used for highlighting body parts in feedback.
 */
export const ComparisonVectorToTerminalFeedbackBodyPartMap = new Map<TerminalFeedbackBodyPartIndex, TerminalFeedbackBodyPart>([
    [0, "torso"], // leftShoulder -> rightShoulder
    [1, "torso"], // leftShoulder -> leftHip
    [2, "torso"], // leftHip -> rightHip
    [3, "torso"], // rightHip -> rightShoulder
    [4, "leftarm"], // leftShoulder -> leftElbow
    [5, "leftarm"], // leftElbow -> leftWrist
    [6, "rightarm"], // rightShoulder -> rightElbow
    [7, "rightarm"], // rightElbow -> rightWrist
]);

/**
 * Calculate the magnitude of a 2D vector.
 * @param v - 2D vector as an array [x, y]
 * @returns Magnitude of the vector
 */
export function getMagnitude(v: [number, number]) {
    return Math.pow(Math.pow(v[0], 2) + Math.pow(v[1], 2), 0.5)
}

/**
 * Calculate the inner angle between two 2D vectors.
 * @param v1 - First vector as an array [x, y]
 * @param v2 - Second vector as an array [x, y]
 * @returns Inner angle between the two vectors in radians
 */
export function getInnerAngle(v1: [number, number], v2: [number, number]) {
    return Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (getMagnitude(v1) * getMagnitude(v2)))
}

/**
 * Add two 2D vectors element-wise.
 * @param v1 - First vector as an array [x, y]
 * @param v2 - Second vector as an array [x, y]
 * @returns Resulting vector as an array [x, y]
 */
export function addVectors(v1: [number, number], v2: [number, number]) {
    return [v1[0] + v2[0], v1[1] + v2[1]]
}

/**
 * Calculate the sum of elements in an array of numbers.
 * @param v - Array of numbers
 * @returns Sum of the array elements
 */
export function getArraySum(v: Array<number>) {
    return v.reduce((a, b) => a + b, 0)
}

/**
 * Calculate the mean (average) of elements in an array of numbers.
 * @param v - Array of numbers
 * @returns Mean of the array elements
 */
export function getArrayMean(v: Array<number>) {
    return getArraySum(v) / v.length
}

/**
 * Calculate a 2D vector between two pose landmarks.
 * @param pixelLandmarks - 2D pixel coordinates of pose landmarks
 * @param srcLandmark - Index of the source landmark
 * @param destLandmark - Index of the destination landmark
 * @returns 2D vector as an array [x, y]
 */
export function GetVector(    
    pixelLandmarks: Pose2DPixelLandmarks,
    srcLandmark: number,
    destLandmark: number
) {
    const {x: sx, y: sy } = pixelLandmarks[srcLandmark]
    const {x: dx, y: dy } = pixelLandmarks[destLandmark]
    return [dx - sx, dy - sy] as [number, number]
}

/**
 * Calculate a normalized 2D vector between two pose landmarks.
 * @param pixelLandmarks - 2D pixel coordinates of pose landmarks
 * @param srcLandmark - Index of the source landmark
 * @param destLandmark - Index of the destination landmark
 * @returns Normalized 2D vector as an array [x, y]
 */
export function GetNormalizedVector(
    pixelLandmarks: Pose2DPixelLandmarks,
    srcLandmark: number,
    destLandmark: number, 
){
    // TODO: utilize a vector arithmetic library?
    const [vec_x, vec_y] = GetVector(pixelLandmarks, srcLandmark, destLandmark)
    const mag = getMagnitude([vec_x, vec_y]);
    return [vec_x / mag, vec_y / mag]
}
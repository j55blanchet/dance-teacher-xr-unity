import type { TerminalFeedbackBodyPart, TerminalFeedbackBodyPartIndex } from "$lib/model/TerminalFeedback";
import {PoseLandmarkIds, type PoseLandmarkIndex, type Pose2DPixelLandmarks, PoseLandmarkKeys, type Pose3DLandmarkFrame } from  "$lib/webcam/mediapipe-utils";

export type PoseVectorIdPair = [PoseLandmarkIndex, PoseLandmarkIndex]
export type VectorAngleComparisonInfo = { vec1: PoseVectorIdPair, vec2: PoseVectorIdPair, rangeOfMotion: number};

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
    const leftTorsoHeight = getMagnitude2DVec(Get2DVector(pixelLandmarks, PoseLandmarkIds.leftShoulder, PoseLandmarkIds.leftHip))
    const rightTorsoHeight = getMagnitude2DVec(Get2DVector(pixelLandmarks, PoseLandmarkIds.rightShoulder, PoseLandmarkIds.rightHip))
    const shoulderWidth = getMagnitude2DVec(Get2DVector(pixelLandmarks, PoseLandmarkIds.leftShoulder, PoseLandmarkIds.rightShoulder))
    
    // Combine the measurements to compute the scale indicator
    return 0.25 * leftTorsoHeight + 
           0.25 * rightTorsoHeight +
           0.5 * shoulderWidth
}

/**
 * Definition of comparison vectors for the Qijia method.
 * These vectors represent pairs of pose landmarks used for similarity calculations.
 */
export const QijiaMethodComparisonVectors: Readonly<Array<PoseVectorIdPair>> = Object.freeze([
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
 * A set of angles between adjacent body parts that are used for similarity calculations. Each angle
 * can be calculated as the inner angle between two vectors. The vectors are defined by pairs of
 * pose landmarks.
 * 
 * Different body joints may be capable of different ranges of motion, so the range of motion of 
 * joint is included in the comparison info, to allow for normalization of the angle values if needed.
 */
export const BodyInnerAnglesComparisons: Readonly<Record<string, VectorAngleComparisonInfo>> = Object.freeze({
   'left-shoulder-pitch': {
        vec1: [PoseLandmarkIds.leftShoulder, PoseLandmarkIds.leftElbow], 
        vec2: [PoseLandmarkIds.leftShoulder, PoseLandmarkIds.leftHip],
        // we can roughly pitch the shoulder from 90 degrees (beside hip) 
        // to -90 degrees (straight up), for a total range of 180 degrees
        rangeOfMotion: Math.PI 
   },
   'left-shoudler-yaw': {
        vec1: [PoseLandmarkIds.leftShoulder, PoseLandmarkIds.leftElbow],
        vec2: [PoseLandmarkIds.leftShoulder, PoseLandmarkIds.rightShoulder],
        // we can roughtly pivot the shoulder from +90 degrees (pointing forward)
        // to -90 degrees (pointing backward), for a total range of 180 degrees
        rangeOfMotion: Math.PI
   },
   'left-elbow-bend': {
        vec1: [PoseLandmarkIds.leftElbow, PoseLandmarkIds.leftShoulder],
        vec2: [PoseLandmarkIds.leftElbow, PoseLandmarkIds.leftWrist],
        // we can roughly bend the elbow from 0 degrees (straight) to 180 degrees (fully bent)
        // for a total range of 180 degrees
        rangeOfMotion: Math.PI
   },
   'neck-shoulderline-angle': {
        vec1: [PoseLandmarkIds.leftShoulder, PoseLandmarkIds.rightShoulder],
        vec2: [PoseLandmarkIds.leftShoulder, PoseLandmarkIds.nose],
        // we can roughtly bend the neck from -90 degrees (on right shoulder) 
        // to 90 deg (on left shoulder)
        rangeOfMotion: Math.PI
   },
   'right-shoulder-pitch': {
        vec1: [PoseLandmarkIds.rightShoulder, PoseLandmarkIds.rightElbow],
        vec2: [PoseLandmarkIds.rightShoulder, PoseLandmarkIds.rightHip],
        rangeOfMotion: Math.PI,
   },
    'right-shoulder-yaw': {
        vec1: [PoseLandmarkIds.rightShoulder, PoseLandmarkIds.rightElbow],
        vec2: [PoseLandmarkIds.rightShoulder, PoseLandmarkIds.leftShoulder],
        rangeOfMotion: Math.PI,
    },
    'right-elbow-bend': {
        vec1: [PoseLandmarkIds.rightElbow, PoseLandmarkIds.rightShoulder],
        vec2: [PoseLandmarkIds.rightElbow, PoseLandmarkIds.rightWrist],
        rangeOfMotion: Math.PI
    },
});

/**
 * Calculate the inner angle between two 3D vectors, in radians. 
 * 
 * The inner angle is the smallest possible angle between the two vectors, measured from the first 
 * vector to the second, in the range [0, pi]. This angle is on the plane defined by the two vectors.
 * 
 * @param vec1 The first vector as an array [x, y, z]
 * @param vec2 The second vector as an array [x, y, z]
 * @returns The inner angle between the two vectors in radians
 */
export function getInnerAngleBetweenVectors(vec1: [number, number, number], vec2: [number, number, number]) {
    const [x1, y1, z1] = vec1;
    const [x2, y2, z2] = vec2;
    const dotProduct = x1 * x2 + y1 * y2 + z1 * z2;
    const mag1 = Math.pow(x1 * x1 + y1 * y1 + z1 * z1, 0.5);
    const mag2 = Math.pow(x2 * x2 + y2 * y2 + z2 * z2, 0.5);
    const cosTheta = dotProduct / (mag1 * mag2);
    return Math.acos(cosTheta);    
}

/**
 * Calcualte the inner angle between two 3D vectors, in radians, from a given pose frame.
 * @param frame Pose estimation result frame
 * @param srcVectorIds IDs of the source vector landmarks
 * @param destVectorIDs IDs of the destination vector landmarks
 * @returns The inner angle between the two vectors in radians
 */
export function getInnerAngleFromFrame(frame: Pose3DLandmarkFrame, srcVectorIds: PoseVectorIdPair, destVectorIDs: PoseVectorIdPair) {
    const vec1 = Get3DNormalizedVector(frame, srcVectorIds[0], srcVectorIds[1]);
    const vec2 = Get3DNormalizedVector(frame, destVectorIDs[0], destVectorIDs[1]);
    return getInnerAngleBetweenVectors(vec1, vec2);
}

/**
 * Calculate the magnitude of a 2D vector.
 * @param v - 2D vector as an array [x, y]
 * @returns Magnitude of the vector
 */
export function getMagnitude2DVec(v: [number, number]) {
    return Math.pow(Math.pow(v[0], 2) + Math.pow(v[1], 2), 0.5)
}

/**
 * Calculate the magnitude of a 3D vector.
 * @param v - 3D vector as an array [x, y, z]
 * @returns Magnitude of the vector
 */
export function getMagnitude3DVec(v: [number, number, number]) {
    return Math.pow(Math.pow(v[0], 2) + Math.pow(v[1], 2) + Math.pow(v[2], 2), 0.5)
}

/**
 * Calculate the inner angle between two 2D vectors.
 * @param v1 - First vector as an array [x, y]
 * @param v2 - Second vector as an array [x, y]
 * @returns Inner angle between the two vectors in radians
 */
export function getInnerAngle(v1: [number, number], v2: [number, number]) {
    return Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (getMagnitude2DVec(v1) * getMagnitude2DVec(v2)))
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
export function Get2DVector(    
    pixelLandmarks: Pose2DPixelLandmarks,
    srcLandmark: number,
    destLandmark: number
) {
    const {x: sx, y: sy } = pixelLandmarks[srcLandmark]
    const {x: dx, y: dy } = pixelLandmarks[destLandmark]
    return [dx - sx, dy - sy] as [number, number]
}

/**
 * Calculate a normalized 2D vector between two pose landmarks. Note: this is distinct from the
 * normalization that mediapipe does (which isn't useful since it skews that aspect ratio. In this
 * case, normalization simply means scaling the vector to have a magnitude of 1.
 * @param pixelLandmarks - 2D pixel coordinates of pose landmarks
 * @param srcLandmark - Index of the source landmark
 * @param destLandmark - Index of the destination landmark
 * @returns Normalized 2D vector as an array [x, y]
 */
export function GetNormalized2DVector(
    pixelLandmarks: Pose2DPixelLandmarks,
    srcLandmark: number,
    destLandmark: number, 
){
    // TODO: utilize a vector arithmetic library?
    const [vec_x, vec_y] = Get2DVector(pixelLandmarks, srcLandmark, destLandmark)
    const mag = getMagnitude2DVec([vec_x, vec_y]);
    return [vec_x / mag, vec_y / mag]
}

/**
 * Calculates the 3D vector between two pose landmarks.
 * @param landmarks - 3D coordinates of pose landmarks
 * @param srcLandmark - Index of the source landmark
 * @param destLandmark - Index of the destination landmark
 * @returns Vector pointing from source to destination as an array [x, y, z]
 */
export function Get3DVector(
    landmarks: Pose3DLandmarkFrame,
    srcLandmark: number,
    destLandmark: number
) {
    const {x: sx, y: sy, z: sz } = landmarks[srcLandmark]
    const {x: dx, y: dy, z: dz } = landmarks[destLandmark]
    return [dx - sx, dy - sy, dz - sz] as [number, number, number]
}

export function Get3DNormalizedVector(
    landmarks: Pose3DLandmarkFrame,
    srcLandmark: number,
    destLandmark: number
) {
    const [vec_x, vec_y, vec_z] = Get3DVector(landmarks, srcLandmark, destLandmark)
    const mag = getMagnitude3DVec([vec_x, vec_y, vec_z]);
    return [vec_x / mag, vec_y / mag, vec_z / mag] as [number, number, number]
}
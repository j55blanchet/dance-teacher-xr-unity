import type { Pose2DPixelLandmarks } from  "$lib/webcam/mediapipe-utils";
import { UserEvaluationRecorder } from "./UserEvaluationRecorder";
import { GetNormalizedVector, GetScaleIndicator, GetVector, QijiaMethodComparisonVectors, getArrayMean, getInnerAngle, getMagnitude } from "./EvaluationCommonUtils";


/**
 * Calculates the jerk (third derivative) of the poses at every frame.
 * @param poses - Array of poses at different frames (either user or reference poses)
 * @param frameTimes - Array of frame times corresponding to the poses
 * @returns Array of jerks (third derivatives) of poses
 */
 function calculateJerks(
    poses: Pose2DPixelLandmarks[],
    frameTimes: number[],
    scale: number
): number[][][] {
    const numFrames = poses.length;

    if (numFrames < 4) {
        throw new Error("Insufficient frames for calculating third derivative.");
    }

    const jerks: number[][][] = [];

    for (let i = 2; i < numFrames - 3; i++) {
        const dt1 = frameTimes[i + 2] - frameTimes[i + 1];
        const dt2 = frameTimes[i + 1] - frameTimes[i - 1];
        const dt3 = frameTimes[i - 1] - frameTimes[i - 2];

        const vectorDissimilarityScores = QijiaMethodComparisonVectors.map((vecLandmarkIds) => {
            const [srcLandmark, destLandmark] = vecLandmarkIds
            const [refX_ip, refY_ip] = GetVector(poses[i-1], srcLandmark, destLandmark);
            const [refX_ipp, refY_ipp] = GetVector(poses[i-2], srcLandmark, destLandmark);
            const [refX_in, refY_in] = GetVector(poses[i+1], srcLandmark, destLandmark);
            const [refX_inn, refY_inn] = GetVector(poses[i+2], srcLandmark, destLandmark);
            
            const d3x = (
                (refX_inn - 2 * refX_in + 2 * refX_ip - refX_ipp) /
                (dt1 * dt2 * dt3)
            ) * scale; // Apply scaling factor here
    
            const d3y = (
                (refY_inn - 2 * refY_in + 2 * refY_ip - refY_ipp) /
                (dt1 * dt2 * dt3)
            ) * scale; // Apply scaling factor here


            return [d3x, d3y];
        });

        jerks.push(vectorDissimilarityScores);
    }

    return jerks;
}

/**
 * Calculates the standard deviation of the differences between user and reference jerks.
 * @param userPoses - Array of user poses
 * @param referencePoses - Array of reference poses
 * @param frameTimes - Array of frame times corresponding to the poses
 * @returns Standard deviation of the differences between user and reference jerks
 */
export function calculateSDJerks(
    userPoses: Pose2DPixelLandmarks[],
    referencePoses: Pose2DPixelLandmarks[],
    frameTimes: number[]
): number {
    let usrScale = GetScaleIndicator(userPoses[0]);
    let refScale = GetScaleIndicator(referencePoses[0]);

    let userJerks = calculateJerks(userPoses, frameTimes, usrScale);
    let referenceJerks = calculateJerks(referencePoses, frameTimes, refScale);

    const squaredDifferences = userJerks.map((userJerk, index) => {
        const referenceJerk = referenceJerks[index];

        const frameSquaredDiff = userJerk.map((usrVector, vectorIndex) => {
            const refVector = referenceJerk[vectorIndex];

            // Ensure that both user and reference vectors have the same length (x and y components)
            if (usrVector.length !== refVector.length) {
                throw new Error("User and reference vectors have different dimensions.");
            }

            // Calculate squared difference for each vector component
            const vectorSquaredDiff = usrVector.reduce((total, usrComponent, componentIndex) => {
                const refComponent = refVector[componentIndex];
                const squaredComponentDiff = Math.pow(usrComponent - refComponent, 2);
                return total + squaredComponentDiff;
            }, 0);

            // Calculate the average squared difference for the vector
            return vectorSquaredDiff / usrVector.length;
        });

        // Calculate the mean squared difference for the frame
        const meanSquaredDifference = frameSquaredDiff.reduce((total, frameDiff) => total + frameDiff, 0) / frameSquaredDiff.length;

        return meanSquaredDifference;
    });

    // Calculate the overall mean squared difference across all frames
    const overallMeanSquaredDifference = squaredDifferences.reduce(
        (total, frameDiff) => total + frameDiff,
        0
    ) / squaredDifferences.length;

    // Calculate the standard deviation as the square root of the mean squared difference
    const standardDeviation = Math.sqrt(overallMeanSquaredDifference);

    return standardDeviation;
}
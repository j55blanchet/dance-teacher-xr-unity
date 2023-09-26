import type { Pose2DPixelLandmarks } from  "$lib/webcam/mediapipe-utils";
import { GetScaleIndicator, Get2DVector, QijiaMethodComparisonVectors, getArrayMean, getArraySD, getMagnitude2DVec } from "./EvaluationCommonUtils";

/**
 * Removes duplicate frame times from an array of user poses and corresponding frame times.
 * @param {Pose2DPixelLandmarks[]} userPoses - Array of user poses.
 * @param {number[]} frameTimes - Array of frame times corresponding to the poses.
 * @returns {{ adjUserPoses: Pose2DPixelLandmarks[], uniqueFrameTimes: number[] }} An object containing adjusted user poses and unique frame times.
 */
export function removeDuplicateFrameTimes(userPoses: Pose2DPixelLandmarks[], frameTimes: number[]): { adjUserPoses: Pose2DPixelLandmarks[], uniqueFrameTimes: number[] } {
    const uniqueFrameTimes = [];
    const adjUserPoses = [];

    for (let i = 0; i < frameTimes.length; i++) {
        const currentTime = frameTimes[i];

        // Check if the current frame time is not the same as the previous one
        if (i === 0 || currentTime !== frameTimes[i - 1]) {
            uniqueFrameTimes.push(currentTime);
            adjUserPoses.push(userPoses[i]);
        }
    }

    return { adjUserPoses, uniqueFrameTimes };
}

/**
 * Calculates the jerk (third derivative) of the poses at every frame.
 *
 * @param {Pose2DPixelLandmarks[]} poses - Array of poses at different frames (either user or reference poses).
 * @param {number[]} frameTimes - Array of frame times corresponding to the poses.
 * @param {number} scale - Scaling factor for jerk calculation.
 * @returns {number[][][]} Array of jerks (third derivatives) of poses.
 *
 * @throws {Error} Throws an error if there are insufficient frames for calculating the third derivative.
 */
 function calculateJerks(
    poses: Pose2DPixelLandmarks[],
    frameTimes: number[],
    scale: number, 
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
            const [refX_ip, refY_ip] = Get2DVector(poses[i-1], srcLandmark, destLandmark);
            const [refX_ipp, refY_ipp] = Get2DVector(poses[i-2], srcLandmark, destLandmark);
            const [refX_in, refY_in] = Get2DVector(poses[i+1], srcLandmark, destLandmark);
            const [refX_inn, refY_inn] = Get2DVector(poses[i+2], srcLandmark, destLandmark);
            
            const d3x = (
                (refX_inn - 2 * refX_in + 2 * refX_ip - refX_ipp) /
                (dt1 * dt2 * dt3)
            ) / scale;
    
            const d3y = (
                (refY_inn - 2 * refY_in + 2 * refY_ip - refY_ipp) /
                (dt1 * dt2 * dt3)
            ) / scale;

            return [d3x, d3y];
        });

        jerks.push(vectorDissimilarityScores);
    }

    return jerks;
}


/**
 * Calculates the standard deviation of the differences between adjusted user jerks and reference jerks.
 *
 * @param {Pose2DPixelLandmarks[]} adjUserPoses - Array of adjusted user poses.
 * @param {Pose2DPixelLandmarks[]} referencePoses - Array of reference poses.
 * @param {number[]} uniqueFrameTimes - Array of unique frame times corresponding to the poses.
 * @returns {[number, number, number]} Standard deviation of the differences between user and reference motion descriptors.
 *
 * @throws {Error} Throws an error if there is invalid input data, mismatched array lengths,
 * or if jerks calculation fails.
 */
 export function calculateMotionDescriptorsScore(
    adjUserPoses: Pose2DPixelLandmarks[],
    referencePoses: Pose2DPixelLandmarks[],
    uniqueFrameTimes: number[]
): [number, number, number] {
    if (!adjUserPoses || adjUserPoses.length === 0 || !referencePoses || referencePoses.length === 0) {
        throw new Error("Invalid input data. Both adjUserPoses and referencePoses must be non-empty arrays.");
    }

    if (adjUserPoses.length !== referencePoses.length) {
        throw new Error("Mismatched array lengths between adjUserPoses and referencePoses.");
    }

    const usrScale = GetScaleIndicator(adjUserPoses[0]);
    const refScale = GetScaleIndicator(referencePoses[0]);

    if (!uniqueFrameTimes || uniqueFrameTimes.length === 0) {
        throw new Error("Bad uniqueFrameTimes");
    }

    const userJerks = calculateJerks(adjUserPoses, uniqueFrameTimes, usrScale);
    const referenceJerks = calculateJerks(referencePoses, uniqueFrameTimes, refScale);
    const userAccs = calculateAccs(adjUserPoses, uniqueFrameTimes, usrScale);
    const referenceAccs = calculateAccs(referencePoses, uniqueFrameTimes, refScale);
    const userVels = calculateVels(adjUserPoses, uniqueFrameTimes, usrScale);
    const referenceVels = calculateVels(referencePoses, uniqueFrameTimes, refScale);

    let jerkScalarDifference: number[] = [];
    let accScalarDifference: number[] = [];
    let velScalarDifference: number[] = [];

    for (let time = 0; time < uniqueFrameTimes.length; time++) {
        if (userJerks[time] && referenceJerks[time]) {

            for (let vec = 0; vec < userJerks[time].length; vec++) {
                if (userJerks[time][vec] && referenceJerks[time][vec]) {
                    const usrJerkMag = getMagnitude2DVec([userJerks[time][vec][0], userJerks[time][vec][1]]);
                    const refJerkMag = getMagnitude2DVec([referenceJerks[time][vec][0], referenceJerks[time][vec][1]]);

                    const usrAccMag = getMagnitude2DVec([userAccs[time][vec][0], userAccs[time][vec][1]]);
                    const refAccMag = getMagnitude2DVec([referenceAccs[time][vec][0], referenceAccs[time][vec][1]]);

                    const usrVelMag = getMagnitude2DVec([userVels[time][vec][0], userVels[time][vec][1]]);
                    const refVelMag = getMagnitude2DVec([referenceVels[time][vec][0], referenceVels[time][vec][1]]);

                    // console.log(`usrAccMag = ${usrAccMag}`);
                    // console.log(`refAccMag = ${refAccMag}`);
                    // console.log(`usrVelMag = ${usrVelMag}`);
                    // console.log(`refVelMag = ${refVelMag}`);

                    jerkScalarDifference.push(usrJerkMag - refJerkMag);
                    accScalarDifference.push(usrAccMag - refAccMag);
                    velScalarDifference.push(usrVelMag - refVelMag);
                }
            }
        }
    }

    const sdJerks = getArraySD(jerkScalarDifference);
    const sdAccs = getArraySD(accScalarDifference);
    const sdVels = getArraySD(velScalarDifference);

    return [sdJerks, sdAccs, sdVels];
}


/**
 * Calculates the acceleration (second derivative) of the poses at every frame.
 *
 * @param {Pose2DPixelLandmarks[]} poses - Array of poses at different frames (either user or reference poses).
 * @param {number[]} frameTimes - Array of frame times corresponding to the poses.
 * @param {number} scale - Scaling factor for acceleration calculation.
 * @returns {number[][][]} Array of accelerations (second derivatives) of poses.
 *
 * @throws {Error} Throws an error if there are insufficient frames for calculating the second derivative.
 */
 function calculateAccs(
    poses: Pose2DPixelLandmarks[],
    frameTimes: number[],
    scale: number
  ): number[][][] {
    const numFrames = poses.length;
  
    if (numFrames < 3) {
      throw new Error("Insufficient frames for calculating second derivative.");
    }
  
    const accelerations: number[][][] = [];
  
    for (let i = 1; i < numFrames - 1; i++) {
      const dt1 = frameTimes[i + 1] - frameTimes[i];
      const dt2 = frameTimes[i] - frameTimes[i - 1];
  
      const vectorDissimilarityScores = QijiaMethodComparisonVectors.map(
        (vecLandmarkIds) => {
          const [srcLandmark, destLandmark] = vecLandmarkIds;
          const [refX_i, refY_i] = Get2DVector(poses[i], srcLandmark, destLandmark);
          const [refX_ip, refY_ip] = Get2DVector(poses[i - 1], srcLandmark, destLandmark);
          const [refX_in, refY_in] = Get2DVector(poses[i + 1], srcLandmark, destLandmark);
  
          const d2x = (
            (refX_in - 2 * refX_i + refX_ip) /
            (dt1 * dt2)
          ) / scale;
  
          const d2y = (
            (refY_in - 2 * refY_i + refY_ip) /
            (dt1 * dt2)
          ) / scale;
  
          return [d2x, d2y];
        }
      );
  
      accelerations.push(vectorDissimilarityScores);
    }
  
    return accelerations;
  }


/**
 * Calculates the velocity (first derivative) of the poses at every frame.
 *
 * @param {Pose2DPixelLandmarks[]} poses - Array of poses at different frames (either user or reference poses).
 * @param {number[]} frameTimes - Array of frame times corresponding to the poses.
 * @param {number} scale - Scaling factor for velocity calculation.
 * @returns {number[][][]} Array of velocities (first derivatives) of poses.
 *
 * @throws {Error} Throws an error if there are insufficient frames for calculating the first derivative.
 */
 function calculateVels(
    poses: Pose2DPixelLandmarks[],
    frameTimes: number[],
    scale: number
  ): number[][][] {
    const numFrames = poses.length;
  
    if (numFrames < 2) {
      throw new Error("Insufficient frames for calculating first derivative.");
    }
  
    const velocities: number[][][] = [];
  
    for (let i = 1; i < numFrames; i++) {
      const dt = frameTimes[i] - frameTimes[i - 1];
  
      const vectorDissimilarityScores = QijiaMethodComparisonVectors.map(
        (vecLandmarkIds) => {
          const [srcLandmark, destLandmark] = vecLandmarkIds;
          const [refX_i, refY_i] = Get2DVector(poses[i], srcLandmark, destLandmark);
          const [refX_ip, refY_ip] = Get2DVector(poses[i - 1], srcLandmark, destLandmark);
  
          const dx = (refX_i - refX_ip) / (dt * scale);
          const dy = (refY_i - refY_ip) / (dt * scale);
  
          return [dx, dy];
        }
      );
  
      velocities.push(vectorDissimilarityScores);
    }
  
    return velocities;
  }
  
import type { Pose2DPixelLandmarks } from  "$lib/webcam/mediapipe-utils";
import { GetScaleIndicator, Get2DVector, QijiaMethodComparisonVectors, getMatricesMAE, getMatricesRMSE, getMagnitude2DVec } from "./EvaluationCommonUtils";

/**
 * Removes duplicate frame times from an array of user poses and corresponding frame times.
 * @param {Pose2DPixelLandmarks[]} userPoses - Array of user poses.
 * @param {number[]} frameTimes - Array of frame times corresponding to the poses.
 * @returns {{ matchingUserPoses: Pose2DPixelLandmarks[], uniqueFrameTimes: number[] }} An object containing adjusted user poses and unique frame times.
 */
export function removeDuplicateFrameTimes(userPoses: Pose2DPixelLandmarks[], frameTimes: number[]): { matchingUserPoses: Pose2DPixelLandmarks[], uniqueFrameTimes: number[] } {
    const uniqueFrameTimes = [];
    const matchingUserPoses = [];

    for (let i = 0; i < frameTimes.length; i++) {
        const currentTime = frameTimes[i];

        // Check if the current frame time is not the same as the previous one
        if (i === 0 || currentTime !== frameTimes[i - 1]) {
            uniqueFrameTimes.push(currentTime);
            matchingUserPoses.push(userPoses[i]);
        }
    }

    return { matchingUserPoses, uniqueFrameTimes };
}


/**
 * Calculates the MAE and RMSE for velocity, acceleration, and jerk between matchingUserPoses and referencePoses.
 *
 * @param {Pose2DPixelLandmarks[]} matchingUserPoses - Array of adjusted user poses.
 * @param {Pose2DPixelLandmarks[]} referencePoses - Array of reference poses.
 * @param {number[]} uniqueFrameTimes - Array of unique frame times corresponding to the poses.
 * @returns {[number, number, number, number, number, number]} MSE and RMSE between user and reference motion descriptors.
 * Both MAE and RMSE measure the how different the user's poses are from the refence poses.
 * Mean Absolute Error (MAE):
 *  Intuitive Interpretation: MAE is straightforward to understand. It measures the average absolute difference between the values in two arrays.
 *  Robustness to Outliers: MAE is less sensitive to extreme outliers compared to RMSE because it doesn't square the differences.
 *  Easy to Compute: It involves simple arithmetic operations and doesn't require complex calculations.
 * Root Mean Square Error (RMSE):
 *  Sensitivity to Large Errors: RMSE gives higher weight to larger errors due to squaring the differences. This makes it more suitable when large errors need to be penalized more.
 *  Differentiability: RMSE is differentiable at all points, which can be important for optimization problems.
 * approximate range:
 *  jerksMAE Range: Approximately 170,000 to 240,000
 *  jerksRSME Range: Approximately 14,000 to 75,000
 * accsMAE Range: Approximately 2,500 to 5,600
 *  accsRSME Range: Approximately 500 to 1,600
 *  velsMAE Range: Approximately 95 to 180
 *  velsRSME Range: Approximately 18 to 40
 * @throws {Error} Throws an error if there is invalid input data, mismatched array lengths, or bad unique frametimes.
 */
export function calculateMotionDescriptorsScore(
  matchingUserPoses: Pose2DPixelLandmarks[],
  referencePoses: Pose2DPixelLandmarks[],
  uniqueFrameTimes: number[]
): [number, number, number, number, number, number] {
  if (!matchingUserPoses || matchingUserPoses.length === 0 || !referencePoses || referencePoses.length === 0) {
      throw new Error("Invalid input data. Both matchingUserPoses and referencePoses must be non-empty arrays.");
  }

  if (matchingUserPoses.length !== referencePoses.length) {
      throw new Error("Mismatched array lengths between matchingUserPoses and referencePoses.");
  }

  const usrScale = GetScaleIndicator(matchingUserPoses[0]);
  const refScale = GetScaleIndicator(referencePoses[0]);

  if (!uniqueFrameTimes || uniqueFrameTimes.length === 0) {
      throw new Error("Bad uniqueFrameTimes");
  }

  const userVels = calculateVels(matchingUserPoses, uniqueFrameTimes, usrScale);
  const referenceVels = calculateVels(referencePoses, uniqueFrameTimes, refScale);
  const userAccs = calculateDerivative(userVels, uniqueFrameTimes);
  const referenceAccs = calculateDerivative(referenceVels, uniqueFrameTimes);
  const userJerks = calculateDerivative(userAccs, uniqueFrameTimes);
  const referenceJerks = calculateDerivative(referenceAccs, uniqueFrameTimes);

  const usrScalarVels = calculateMetricsMag(userVels);
  const refScalarVels = calculateMetricsMag(referenceVels);
  const usrScalarAccs = calculateMetricsMag(userAccs);
  const refScalarAccs = calculateMetricsMag(referenceAccs);
  const usrScalarJerks = calculateMetricsMag(userJerks);
  const refScalarJerks = calculateMetricsMag(referenceJerks);

  const jerksMAE = getMatricesMAE(usrScalarJerks, refScalarJerks);
  const jerksRSME = getMatricesRMSE(usrScalarJerks, refScalarJerks);
  const accsMAE = getMatricesMAE(usrScalarAccs, refScalarAccs);
  const accsRSME = getMatricesRMSE(usrScalarAccs, refScalarAccs);
  const velsMAE = getMatricesMAE(usrScalarVels, refScalarVels);
  const velsRSME = getMatricesRMSE(usrScalarVels, refScalarVels);

  return [jerksMAE, jerksRSME, accsMAE, accsRSME, velsMAE, velsRSME];
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

/**
 * Computes the first derivative of a 3D array.
 *
 * @param {number[][][]} original - The original array.
 * @param {number[]} frameTimes - Array of frame times corresponding to the original data.
 * @returns {number[][][]} Array representing the first derivative of the original data.
 *
 * @throws {Error} Throws an error if there are insufficient frames for calculating the first derivative.
 */
function calculateDerivative(
  original: number[][][],
  frameTimes: number[]
): number[][][] {
  const numFrames = original.length;

  if (numFrames < 2) {
    throw new Error("Insufficient frames for calculating derivative.");
  }

  const derivatives: number[][][] = [];

  for (let i = 1; i < numFrames; i++) {
    const dt = frameTimes[i] - frameTimes[i - 1];

    const deriv = original[i].map((values, vec) => {
      const [x, y] = values;
      const [prevX, prevY] = original[i - 1][vec];

      const dx = (x - prevX) / dt;
      const dy = (y - prevY) / dt;

      return [dx, dy];
    });

    derivatives.push(deriv);
  }

  return derivatives;
}


/**
 * Calculate the magnitudes of 2D vectors in a 3D array of velocities.
 *
 * @param {number[][][]} vectorMetrics - The 3D array of vector metrics.
 * @returns {number[][]} A 2D array of magnitudes for each 2D vector.
 */
 function calculateMetricsMag(vectorMetrics: number[][][]): number[][] {
  const scalarMetrics: number[][] = [];

  for (let time = 0; time < vectorMetrics.length; time++) {
    const frameVels: number[] = [];

    for (let vec = 0; vec < vectorMetrics[time].length; vec++) {
      const velMag = getMagnitude2DVec([vectorMetrics[time][vec][0], vectorMetrics[time][vec][1]]);
      frameVels.push(velMag);
    }

    scalarMetrics.push(frameVels);
  }

  return scalarMetrics;
}

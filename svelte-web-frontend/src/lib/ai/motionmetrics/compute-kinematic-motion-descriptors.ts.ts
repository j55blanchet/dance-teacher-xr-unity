import type { Pose2DPixelLandmarks } from "$lib/webcam/mediapipe-utils";
import { GetScaleIndicator, getMatricesMAE, getMatricesRMSE, getMagnitude2DVec } from "../EvaluationCommonUtils";


export type Vec2<T> = [T, T];
// type Vec3<T> = [T, T, T];
export type Vec8<T> = [T, T, T, T, T, T, T, T];

function makeUndefinedVec8Frame2D() {
    return makeUndefined2DMatrix(8, 2) as Vec8<Vec2<undefined>>;
}
function makeUndefinedArray(length: number): undefined[] {
    return new Array(length).fill(undefined);
}
function makeUndefinedMatrix(dims: number[]): any {

    if (dims.length === 1) {
        return makeUndefinedArray(dims[0])
    }

    const matrix = [];
    for (let i = 0; i < dims[0]; i++) {
        matrix.push(makeUndefinedMatrix(dims.slice(1)));
    }
    return matrix;
}
function makeUndefined2DMatrix(m: number, n: number) {
    return makeUndefinedMatrix([m, n]) as undefined[][]
}

function replaceNaNsWithUndefined(num: number) {
    return isNaN(num) ? undefined : num;
}

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
 * @param {number[]} frameTimes - Array of unique frame times corresponding to the poses.
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
export function calculateKinematicErrorDescriptors(
    matchingUserPoses: Pose2DPixelLandmarks[],
    referencePoses: Pose2DPixelLandmarks[],
    frameTimes: number[],
    usrScale?: number,
    refScale?: number
) {
    if (!matchingUserPoses || !referencePoses || !frameTimes) {
        throw new Error("Invalid input data. Either matchingUserPoses or referencePoses is null.");
    }

    if (matchingUserPoses.length !== referencePoses.length || matchingUserPoses.length !== frameTimes.length) {
        throw new Error("Mismatched array lengths between matchingUserPoses and referencePoses.");
    }

    const frameCount = matchingUserPoses.length;

    usrScale ??= frameCount > 0 ? GetScaleIndicator(matchingUserPoses[0]) : 1;
    refScale ??= frameCount > 0 ? GetScaleIndicator(referencePoses[0]) : 1;

    const userVels = calculateVels(matchingUserPoses, frameTimes, usrScale);
    const referenceVels = calculateVels(referencePoses, frameTimes, refScale);
    const userAccs = calculateDerivative(userVels, frameTimes);
    const referenceAccs = calculateDerivative(referenceVels, frameTimes);
    const userJerks = calculateDerivative(userAccs, frameTimes);
    const referenceJerks = calculateDerivative(referenceAccs, frameTimes);

    const usrScalarVels = calculateMetricsMag(userVels);
    const refScalarVels = calculateMetricsMag(referenceVels);
    const usrScalarAccs = calculateMetricsMag(userAccs);
    const refScalarAccs = calculateMetricsMag(referenceAccs);
    const usrScalarJerks = calculateMetricsMag(userJerks);
    const refScalarJerks = calculateMetricsMag(referenceJerks);

    const velsMAE = getMatricesMAE(usrScalarVels, refScalarVels) ?? null;
    const velsRSME = getMatricesRMSE(usrScalarVels, refScalarVels) ?? null;
    const accsMAE = getMatricesMAE(usrScalarAccs, refScalarAccs) ?? null;
    const accsRSME = getMatricesRMSE(usrScalarAccs, refScalarAccs) ?? null;
    const jerksMAE = getMatricesMAE(usrScalarJerks, refScalarJerks) ?? null;
    const jerksRSME = getMatricesRMSE(usrScalarJerks, refScalarJerks) ?? null;

    return {
        velsMAE,
        velsRSME,
        accsMAE,
        accsRSME,
        jerksMAE,
        jerksRSME,
    };
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
export function calculateVels(
    poses: Pose2DPixelLandmarks[],
    frameTimes: number[],
    scale: number,
): Vec2<number | undefined>[][] {

    const numFrames = poses.length;

    if (poses.length !== frameTimes.length) {
        throw new Error("Mismatched array lengths (poses and frameTimes).");
    }

    const velocities = [] as Vec2<number | undefined>[][];
    if (poses.length === 0) return velocities;

    const landmarkCount = poses[0].length;

    for (let i = 0; i < numFrames; i++) {
        const dt = frameTimes[i] - frameTimes[i - 1];

        // > For the first frame, the velocity is undefined, as there is no previous frame to compare to.
        // > If there are repeat framesTimes, the velocity is undefined, as we unable to calculate it
        // > if the scale is zero, the velocity is undefined, as we would be dividing by zero 
        if (i === 0 || dt === 0 || scale === 0) {
            velocities.push(makeUndefined2DMatrix(landmarkCount, 2) as Vec2<undefined>[]);
            continue;
        }

        const prevPoseFrame: Pose2DPixelLandmarks | undefined = poses[i - 1];
        const poseFrame: Pose2DPixelLandmarks = poses[i];

        if (poseFrame.length !== landmarkCount) {
            throw new Error("Mismatched array lengths (landmarkCount).");
        }

        const velocitesByVector = poseFrame.map(
            (curLandmark, index) => {
                const pLandmark = prevPoseFrame[index];

                const dx = (curLandmark.x - pLandmark?.x) / (dt * scale);
                const dy = (curLandmark.y - pLandmark?.y) / (dt * scale);

                return [replaceNaNsWithUndefined(dx), replaceNaNsWithUndefined(dy)] as Vec2<number>;
            }
        ) as Vec2<number | undefined>[];

        velocities.push(velocitesByVector);
    }

    return velocities;
}

/**
 * Computes the first derivative of a 3D array.
 *
 * @param original - The original array.
 * @param frameTimes - Array of frame times corresponding to the original data.
 * @returns Array representing the first derivative of the original data.
 *
 * @throws {Error} Throws an error if there are insufficient frames for calculating the first derivative.
 */
export function calculateDerivative(
    original: Vec2<number | undefined>[][],
    frameTimes: number[]
): Vec2<number | undefined>[][] {
    const numFrames = original.length;

    if (original.length !== frameTimes.length) {
        throw new Error("Mismatched array lengths (original and frameTimes).");
    }

    if (original.length === 0) return [];

    const numVectors = original[0].length;
    const derivatives: Array<Array<Vec2<number | undefined>>> = [];

    for (let i = 0; i < numFrames; i++) {
        const dt = frameTimes[i] - frameTimes[i - 1];
        if (original[i].length !== numVectors) {
            throw new Error("Mismatched array lengths.");
        }

        if (i === 0 || dt === 0) {
            const frameDeriv = makeUndefined2DMatrix(numVectors, 2) as Vec2<undefined>[];
            derivatives.push(frameDeriv);
            continue;
        }

        const deriv = original[i].map((values, vec) => {
            const [x, y] = values;
            const [prevX, prevY] = original[i - 1][vec];

            const dx = (x as number - (prevX as number)) / dt;
            const dy = (y as number - (prevY as number)) / dt;

            return [replaceNaNsWithUndefined(dx), replaceNaNsWithUndefined(dy)] as Vec2<number | undefined>;
        }) as Vec8<Vec2<number | undefined>>;

        derivatives.push(deriv);
    }

    return derivatives;
}

/**
 * Calculate the magnitudes of 2D vectors in a 3D array of velocities.
 *
 * @param vectorMetrics - The 3D array of vector metrics.
 * @returns A 2D array of magnitudes for each 2D vector.
 */
function calculateMetricsMag(vectorMetrics: Array<Array<Vec2<number | undefined>>>): Array<Array<number | undefined>> {
    const scalarMetrics: Array<Array<number | undefined>> = [];

    for (let time = 0; time < vectorMetrics.length; time++) {
        const frameVels: Array<number | undefined> = [];

        for (let vec = 0; vec < vectorMetrics[time].length; vec++) {
            const x = vectorMetrics[time][vec][0];
            const y = vectorMetrics[time][vec][1];
            if (x === undefined || y === undefined) {
                frameVels.push(undefined);
                continue;
            }

            const velMag = getMagnitude2DVec([x, y]);
            frameVels.push(velMag);
        }

        scalarMetrics.push(frameVels);
    }

    return scalarMetrics;
}

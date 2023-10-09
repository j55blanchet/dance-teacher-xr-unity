import type { Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";
import { Get3DScaleIndicator, getMatricesMAE, getMatricesRMSE, getMagnitude3DVec } from "../EvaluationCommonUtils";


export type Vec3<T> = [T, T, T];
export type Vec8<T> = [T, T, T, T, T, T, T, T];

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
 * Calculates the MAE and RMSE for velocity, acceleration, and jerk between matchingUserPoses and referencePoses.
 *
 * @param {Pose3DLandmarkFrame[]} matchingUserPoses - Array of adjusted user poses.
 * @param {Pose3DLandmarkFrame[]} referencePoses - Array of reference poses.
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
 * approximate range (to be updated):
 * jerksMAE Range: Approximately 4,200 to 6,900
 * jerksRSME Range: Approximately 7,600 to 23,300
 * accsMAE Range: Approximately 34 to 176
 * accsRSME Range: Approximately 63 to 797
 * velsMAE Range: Approximately 2.6 to 9.0
 * velsRSME Range: Approximately 4.5 to 57.1
 * @throws {Error} Throws an error if there is invalid input data, mismatched array lengths, or bad unique frametimes.
 */
export function calculateKinematicErrorDescriptors(
    matchingUserPoses: Pose3DLandmarkFrame[],
    referencePoses: Pose3DLandmarkFrame[],
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

    usrScale ??= frameCount > 0 ? Get3DScaleIndicator(matchingUserPoses[0]) : 1;
    refScale ??= frameCount > 0 ? Get3DScaleIndicator(referencePoses[0]) : 1;

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
 * @param {Pose3DLandmarkFrame[]} poses - Array of poses at different frames (either user or reference poses).
 * @param {number[]} frameTimes - Array of frame times corresponding to the poses.
 * @param {number} scale - Scaling factor for velocity calculation.
 * @returns {number[][][]} Array of velocities (first derivatives) of poses.
 *
 * @throws {Error} Throws an error if there are insufficient frames for calculating the first derivative.
 */
export function calculateVels(
    poses: Pose3DLandmarkFrame[],
    frameTimes: number[],
    scale: number
): Vec3<number | undefined>[][] {

    const numFrames = poses.length;

    if (poses.length !== frameTimes.length) {
        throw new Error("Mismatched array lengths (poses and frameTimes).");
    }

    const velocities = [] as Vec3<number | undefined>[][];
    if (poses.length === 0) return velocities;

    const landmarkCount = poses[0].length;

    for (let i = 0; i < numFrames; i++) {
        const dt = frameTimes[i] - frameTimes[i - 1];

        // > For the first frame, the velocity is undefined, as there is no previous frame to compare to.
        // > If there are repeat framesTimes, the velocity is undefined, as we unable to calculate it
        // > if the scale is zero, the velocity is undefined, as we would be dividing by zero 
        if (i === 0 || dt === 0 || scale === 0) {
            velocities.push(makeUndefined2DMatrix(landmarkCount, 3) as Vec3<undefined>[]);
            continue;
        }

        const prevPoseFrame: Pose3DLandmarkFrame | undefined = poses[i - 1];
        const poseFrame: Pose3DLandmarkFrame = poses[i];

        if (poseFrame.length !== landmarkCount) {
            throw new Error("Mismatched array lengths (landmarkCount).");
        }

        const velocitesByVector = poseFrame.map(
            (curLandmark, index) => {
                const pLandmark = prevPoseFrame[index];

                const dx = (curLandmark.x - pLandmark?.x) / (dt * scale);
                const dy = (curLandmark.y - pLandmark?.y) / (dt * scale);
                const dz  = (curLandmark.z - pLandmark?.z) / (dt * scale);

                return [replaceNaNsWithUndefined(dx), replaceNaNsWithUndefined(dy), replaceNaNsWithUndefined(dz)] as Vec3<number>;
            }
        ) as Vec3<number | undefined>[];

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
    original: Vec3<number | undefined>[][],
    frameTimes: number[]
): Vec3<number | undefined>[][] {
    const numFrames = original.length;

    if (original.length !== frameTimes.length) {
        throw new Error("Mismatched array lengths (original and frameTimes).");
    }

    if (original.length === 0) return [];

    const numVectors = original[0].length;
    const derivatives: Array<Array<Vec3<number | undefined>>> = [];

    for (let i = 0; i < numFrames; i++) {
        const dt = frameTimes[i] - frameTimes[i - 1];
        if (original[i].length !== numVectors) {
            throw new Error("Mismatched array lengths.");
        }

        if (i === 0 || dt === 0) {
            const frameDeriv = makeUndefined2DMatrix(numVectors, 3) as Vec3<undefined>[];
            derivatives.push(frameDeriv);
            continue;
        }

        const deriv = original[i].map((values, vec) => {
            const [x, y, z] = values;
            const [prevX, prevY, prevZ] = original[i - 1][vec];

            const dx = (x as number - (prevX as number)) / dt;
            const dy = (y as number - (prevY as number)) / dt;
            const dz = (z as number - (prevZ as number)) / dt;

            return [replaceNaNsWithUndefined(dx), replaceNaNsWithUndefined(dy), replaceNaNsWithUndefined(dz)] as Vec3<number | undefined>;
        }) as Vec8<Vec3<number | undefined>>;

        derivatives.push(deriv);
    }

    return derivatives;
}

/**
 * Calculates the magnitudes of 3D vectors in a 3D array of vector metrics.
 * It computes the magnitude for each 3D vector (x, y, z) and stores the results in a 2D array.
 * If any component (x, y, or z) of a vector is undefined, the corresponding magnitude is also undefined.
 *
 * @param {Array<Array<Vec3<number | undefined>>>} vectorMetrics - A 3D array of vector metrics.
 * @returns {Array<Array<number | undefined>>} A 2D array of magnitudes for each 3D vector.
 */
function calculateMetricsMag(vectorMetrics: Array<Array<Vec3<number | undefined>>>): Array<Array<number | undefined>> {
    const scalarMetrics: Array<Array<number | undefined>> = [];

    for (let time = 0; time < vectorMetrics.length; time++) {
        const frameVels: Array<number | undefined> = [];

        for (let vec = 0; vec < vectorMetrics[time].length; vec++) {
            const [x, y, z] = vectorMetrics[time][vec];
            if (x === undefined || y === undefined || z === undefined) {
                frameVels.push(undefined);
                continue;
            }

            const velMag = getMagnitude3DVec([x, y, z]);
            frameVels.push(velMag);
        }

        scalarMetrics.push(frameVels);
    }

    return scalarMetrics;
}

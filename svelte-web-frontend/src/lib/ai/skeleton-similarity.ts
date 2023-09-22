import { lerp } from "$lib/utils/math";
import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";
import { GetNormalized2DVector, GetScaleIndicator, Get2DVector, QijiaMethodComparisonVectors, getArrayMean, getInnerAngle, getMagnitude2DVec, Get3DNormalizedVector, getMagnitude3DVec, getInnerAngleFromFrame, BodyInnerAnglesComparisons } from "./EvaluationCommonUtils";

/**
 * Type definition for an array of 8 numbers.
 * Represents the scores for 8 upper body comparison vectors.
 */
type Vec8 = [number, number, number, number, number, number, number, number]

export const QIJIA_SKELETON_SIMILARITY_MAX_SCORE = 5.0;

/**
 * Compute the similarity of two poses based on a 2D projection, looking at a set of 8 upper body
 * comparison vectors, as described by our JLS paper. The similarity is computed by normalizing each
 * of these comparison vectors and computing the distance between the corresponding normalized vectors,
 * (a value between good=0 and bad=2), remaiing to 0=bad, 5=good, then taking the average across the 
 * comparison vectors.
 * @param refLandmarks Reference landmarks (expert)
 * @param userLandmarks Evaluation landmarks (learner)
 * @returns Tuple of scores between 0 and 5, where 0 is the worst and 5 is the best. First is a scalar with the overall score, next is array of the scores of the 8 comparison vectors.
 */
export function computeSkeletonDissimilarityQijiaMethod(
    refLandmarks: Pose2DPixelLandmarks, 
    userLandmarks: Pose2DPixelLandmarks
) {

    // From the paper: 
    //     At each frame, we compute the absolute difference be-
    // tween the corresponding unit vectors of the learner and the
    // expert, and then sum them up as the per-frame dancing error.
    // The overall dancing error is calculated as the average of all
    // frames of the dance. Finally, we scale the score into the range
    // of [0, 5], where 0 denotes the poorest performance and 5 rep-
    // resents the best performance. This normalized score serves
    // as the final performance rating.
    let rawOverallDisimilarityScore = 0

    // Compare 8 Vectors
    const vectorDissimilarityScores = QijiaMethodComparisonVectors.map((vecLandmarkIds) => {
        const [srcLandmark, destLandmark] = vecLandmarkIds
        const [refX, refY] = GetNormalized2DVector(refLandmarks, srcLandmark, destLandmark)
        const [usrX, usrY] = GetNormalized2DVector(userLandmarks, srcLandmark, destLandmark)
        const [dx, dy] = [refX - usrX, refY - usrY]
        return getMagnitude2DVec([dx, dy]) || 0;
    });


    rawOverallDisimilarityScore = getArrayMean(vectorDissimilarityScores);

    // According to Qijia, we used an upper bound of 2.0 for the dissimimlarity score (which would indicate all vectors
    // of the user faced the exact opposite directions of the expert), and the lower bound was zero (which would indicate
    // a perfect match with the expert)
    // If a user's dissimilarity score was closer to 0, they did well, and if it was closer
    // to 2.0, they did poorly. (These specific numbers are not mentioned in the paper). 
    const SRC_DISSIMILARITY_WORST = 2.0
    const SRC_DISSIMILARITY_BEST = 0.0
    
    // We want to scale the score to a [0...5] range
    const TARGET_WORST = 0.0

    function scaleScore(s: number) {
        return lerp(s, SRC_DISSIMILARITY_BEST, SRC_DISSIMILARITY_WORST, QIJIA_SKELETON_SIMILARITY_MAX_SCORE, TARGET_WORST)
    }

    const overallScore = scaleScore(rawOverallDisimilarityScore)
    const vectorByVectorScore = vectorDissimilarityScores.map(scaleScore) as Vec8;

    return {
        overallScore,
        vectorByVectorScore
    };
}
 
// Constants for reliable 2D angle determination (in pixels)
const MinVectorMagnitudeForReliableAngleDetermination = 50;
const TargetVectorMagnitudeForReliableAngleDetermination = 100;

/**
 * Compute the dissimilarity between two poses using the Julien method.
 * This method calculates the dissimilarity based on angle and magnitude of comparison vectors.
 * @param refLandmarks - Reference landmarks (expert)
 * @param userLandmarks - User landmarks (learner)
 * @returns Object containing the dissimilarity score and information by vector
 */
export function computeSkeleton2DDissimilarityJulienMethod(
    refLandmarks: Pose2DPixelLandmarks,
    userLandmarks: Pose2DPixelLandmarks
) {

    // Idea: 2D vector comparison should look at both angle and magnitude, since angle
    //       changes are only meaningful when a vectors is perpendicular to the camera.
    //         > When both vectors are orthogonal to the camera, the angle between them is
    //           the primary metric for similarity.
    //         > When one or both vectors are parallel to the camera, the magnitude of the
    //           vectors is the primary metric for similarity. (we don't want to compare angles in this case,
    //           because slight changes in angle can result in large changes in the normalized 2D projection 
    //           of the vector).
    //         > We can scale the relative constribution of each of these similarity metrics based on the
    //           current 2D magnitude of the vectors relative to the maximum observed length of that vector.

    // Another idea: Mediapipe includes an approximate z-value for each landmark. We can use this
    //               to simply compute angle changes in 3D space. This is a simpler approach, but
    //               should work so long as mediapipe's z-values are accurate enough.
    const vectorScoreInfos = QijiaMethodComparisonVectors.map((vecLandmarkIds) => {
        const [srcLandmark, destLandmark] = vecLandmarkIds
        const [refX, refY] = Get2DVector(refLandmarks, srcLandmark, destLandmark)
        const [usrX, usrY] = Get2DVector(userLandmarks, srcLandmark, destLandmark)

        const scaleRef = GetScaleIndicator(refLandmarks)
        const scaleUsr = GetScaleIndicator(userLandmarks)

        const [magnitudeRef, magnitudeUsr] = [getMagnitude2DVec([refX, refY]), getMagnitude2DVec([usrX, usrY])]
        const adjustedMagnitudeUsr = magnitudeUsr * scaleRef / scaleUsr
        const magnitudePercentileDifferential = Math.abs(magnitudeRef - adjustedMagnitudeUsr) / Math.max(magnitudeRef, adjustedMagnitudeUsr)

        const innerAngle = getInnerAngle([refX, refY], [usrX, usrY]);
        const innerAnglePercentileDifferential = innerAngle / Math.PI

        // Idea: if either the user or the reference pose is substantially othogonal to the
        // plane of the image, we want to prioritize mangitude comparison (because slight changes in 
        // angle would result in large changes in the normalized 2D projection of the vector). So we 
        // compute a "angle weighting factor" for both the user and reference pose, and use the 
        // minimum of the two
        const percentOfMetricToComputeFromAngleBasedOnReferencePose = lerp(
            magnitudeRef, 
            MinVectorMagnitudeForReliableAngleDetermination, 
            TargetVectorMagnitudeForReliableAngleDetermination,
            0.0,
            1.0
        )
        const percentOfMetricToComputeFromAngleBasedOnUserPose = lerp(
            magnitudeUsr,
            MinVectorMagnitudeForReliableAngleDetermination,
            TargetVectorMagnitudeForReliableAngleDetermination,
            0.0,
            1.0
        )
        // Use the minimum of the two "angle weighing factors". If both are within image plane, this
        // weighting factors will be closer to 1.0, but if either is orthogonal to the image plane,
        // it will be closer to 0.0
        const percentOfMetricToComputeFromAngle = Math.min(percentOfMetricToComputeFromAngleBasedOnReferencePose, percentOfMetricToComputeFromAngleBasedOnUserPose)
        const compoundDissimilarityPercentile = percentOfMetricToComputeFromAngle * innerAnglePercentileDifferential + (1 - percentOfMetricToComputeFromAngle) * magnitudePercentileDifferential

        return {
            magnitude: magnitudePercentileDifferential, 
            angle: innerAnglePercentileDifferential,
            pAngle: percentOfMetricToComputeFromAngle,
            score: compoundDissimilarityPercentile
        };
    });

    return {
        // Score is scaled between 0 and 1 - 0 is the best and 1 is the worst.
        overallScore: getArrayMean(vectorScoreInfos.map((s) => s.score)),
        vectorByVectorScores: vectorScoreInfos
    };
}

/**
 * Calculate the similarity of two 3D poses, based on inner angle between preset pairs of  
 * body comparison vectors (as opposed to Qijia's method, which directly compares the orientation of 
 * vectors to the camera reference frame).
 * @param refLandmarks 3D pose of the expert
 * @param userLandmarks 3D pose of the user
 * @returns An object containing the overall similarity score, and an array of the similarity scores for each vector
 */
export function computeSkeleton3DVectorAngleSimilarity(refLandmarks: Pose3DLandmarkFrame, userLandmarks: Pose3DLandmarkFrame) {

    const results = Object.fromEntries(
        Object.entries(BodyInnerAnglesComparisons).map(([key, comparison]) => {
            const userInnerAngle = getInnerAngleFromFrame(userLandmarks, comparison.vec1, comparison.vec2);
            const refInnerAngle = getInnerAngleFromFrame(refLandmarks, comparison.vec1, comparison.vec2);
            const angleDiff = Math.abs(userInnerAngle - refInnerAngle);
            const scaledAngleDiff = angleDiff / comparison.rangeOfMotion;
            return [key, { 
                user: userInnerAngle, 
                ref: refInnerAngle, 
                diff: angleDiff,
                diffDegrees: angleDiff * 180 / Math.PI,
                score: (1 - scaledAngleDiff)
            }];
        })
    );

    const meanScore = getArrayMean(Object.values(results).map((r) => r.score));

    return {
        overallScore: meanScore,
        individualScores: results,
    }
}
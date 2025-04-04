import { lerp } from "$lib/utils/math";
import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";
import { QijiaMethodComparisonVectors, Get2DVector, Get2DScaleIndicator, getMagnitude2DVec, getInnerAngle, GetArithmeticMean, QijiaMethodComparisionVectorNames } from "../EvaluationCommonUtils";
import type { LiveEvaluationMetric, TrackHistory } from "./MotionMetric";

// Constants for reliable 2D angle determination (in pixels)
const MinVectorMagnitudeForReliableAngleDetermination = 50;
const TargetVectorMagnitudeForReliableAngleDetermination = 100;

/**
 * Compute the dissimilarity between two poses using the Jules method.
 * This method calculates the dissimilarity based on angle and magnitude of comparison vectors.
 * @param refLandmarks - Reference landmarks (expert)
 * @param userLandmarks - User landmarks (learner)
 * @returns Object containing the dissimilarity score and information by vector
 */
function computeSkeleton2DDissimilarityJulesMethod(
    refLandmarks: Readonly<Pose2DPixelLandmarks>,
    userLandmarks: Readonly<Pose2DPixelLandmarks>
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

        const scaleRef = Get2DScaleIndicator(refLandmarks)
        const scaleUsr = Get2DScaleIndicator(userLandmarks)

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
        overallScore: GetArithmeticMean(vectorScoreInfos.map((s) => s.score)),
        vectorByVectorScores: vectorScoreInfos
    };
}

type JulesMetricSingleFrameOutput = ReturnType<typeof computeSkeleton2DDissimilarityJulesMethod>;

type JulesMetricSummaryOutput = {
    minPossibleScore: number;
    maxPossibleScore: number;
    overallScore: number;
    vectorByVectorScore: Record<string, number>;
}

type JulesMetricFormattedSummaryOutput = ReturnType<Jules2DSkeletonSimilarityMetric["formatSummary"]>;

/**
 * Metric that computes the similarity between two poses using the Jules method.
 * This method calculates the dissimilarity based on angle and magnitude of comparison vectors, and 
 * weighs which one to used based on whether the 2D vector is sufficiently long to be reliably
 * compared by angle.
 * @param refLandmarks - Reference landmarks (expert)
 * @param userLandmarks - User landmarks (learner)
 * @returns Object containing the dissimilarity score and information by vector
 */
export default class Jules2DSkeletonSimilarityMetric implements LiveEvaluationMetric<JulesMetricSingleFrameOutput, JulesMetricSummaryOutput, JulesMetricFormattedSummaryOutput> {
    
    computeMetric(_history: Readonly<TrackHistory>, _metricHistory: Readonly<JulesMetricSingleFrameOutput[]>, _videoFrameTimeInSecs: Readonly<number>, _actualTimesInMs: number, user2dPose: Readonly<Pose2DPixelLandmarks>, _user3dPose: Readonly<Pose3DLandmarkFrame>, ref2dPose: Readonly<Pose2DPixelLandmarks>, _ref3dPose: Readonly<Pose3DLandmarkFrame>): JulesMetricSingleFrameOutput {
        return computeSkeleton2DDissimilarityJulesMethod(ref2dPose, user2dPose)
    }

    summarizeMetric(_history: Readonly<TrackHistory>, metricHistory: Readonly<JulesMetricSingleFrameOutput[]>): JulesMetricSummaryOutput {
        
        const overallScore = GetArithmeticMean(metricHistory
            .map(m => m.overallScore)
            .filter((n) => !isNaN(n))
        );
        const arrayOfVecScores = metricHistory.map(m => m.vectorByVectorScores);

        const vectorScoreKeyValues = QijiaMethodComparisonVectors.map((_vec, i) => {
            const key = QijiaMethodComparisionVectorNames[i];
            const thisVecScores = arrayOfVecScores
                .map(vecbyVecScores => vecbyVecScores[i].score)
                .filter((n) => !isNaN(n));
            const meanScore = GetArithmeticMean(thisVecScores);
            return [key, meanScore] as [string, number];
        });
        const byVectorScores = Object.fromEntries(vectorScoreKeyValues) as Record<string, number>;

        return {
            overallScore: overallScore,
            vectorByVectorScore: byVectorScores,
            minPossibleScore: 0,
            maxPossibleScore: 1.0,
        }
    }

    formatSummary(summary: Readonly<JulesMetricSummaryOutput>) {
        return {
            "overall": summary.overallScore,
            ...summary.vectorByVectorScore,
        }
    }
}
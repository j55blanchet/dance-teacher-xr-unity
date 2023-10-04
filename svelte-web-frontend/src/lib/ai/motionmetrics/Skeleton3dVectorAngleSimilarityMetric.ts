import type { Pose3DLandmarkFrame, Pose2DPixelLandmarks } from "$lib/webcam/mediapipe-utils";
import { BodyInnerAnglesComparisons, getInnerAngleFromFrame, getArrayMean } from "../EvaluationCommonUtils";
import type { LiveEvaluationMetric, TrackHistory } from "./MotionMetric";

/**
 * Calculate the similarity of two 3D poses, based on inner angle between preset pairs of  
 * body comparison vectors (as opposed to Qijia's method, which directly compares the orientation of 
 * vectors to the camera reference frame).
 * @param refLandmarks 3D pose of the expert
 * @param userLandmarks 3D pose of the user
 * @returns An object containing the overall similarity score, and an array of the similarity scores for each vector
 */
function computeSkeleton3DVectorAngleSimilarity(refLandmarks: Pose3DLandmarkFrame, userLandmarks: Pose3DLandmarkFrame) {

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

type Angle3DMetricSingleFrameOutput = ReturnType<typeof computeSkeleton3DVectorAngleSimilarity>;

type Angle3DMetricSummaryOutput = {
    minPossibleScore: number;
    maxPossibleScore: number;
    overallScore: number;
    individualScores: Map<string, number>;
}

export default class Skeleton3dVectorAngleSimilarityMetric implements LiveEvaluationMetric<Angle3DMetricSingleFrameOutput, Angle3DMetricSummaryOutput> {
    
    computeMetric(_history: TrackHistory, _metricHistory: Angle3DMetricSingleFrameOutput[], _videoFrameTimeInSecs: number, _actualTimesInMs: number, _user2dPose: Pose2DPixelLandmarks, user3dPose: Pose3DLandmarkFrame, _ref2dPose: Pose2DPixelLandmarks, ref3dPose: Pose3DLandmarkFrame): Angle3DMetricSingleFrameOutput {
        return computeSkeleton3DVectorAngleSimilarity(ref3dPose, user3dPose)
    }

    summarizeMetric(_history: TrackHistory, metricHistory: Angle3DMetricSingleFrameOutput[]): Angle3DMetricSummaryOutput {
        
        const overallScore = getArrayMean(
            metricHistory.map(m => m.overallScore)
                            .filter((n) => !isNaN(n))
        );
        
        const angleSimilarityVectorScoreKeyValues = Object.keys(BodyInnerAnglesComparisons).map((key) => {
            const vecScores = metricHistory.map((scores) => scores.individualScores[key].score)
                                                      .filter((n) => !isNaN(n));
            const meanScore = getArrayMean(vecScores);
            return [key, meanScore] as [string, number];
        });
        const angleSimilarityIndividualScores = new Map(angleSimilarityVectorScoreKeyValues)
    
        return {
            overallScore: overallScore,
            individualScores: angleSimilarityIndividualScores,
            minPossibleScore: 0,
            maxPossibleScore: 1.0,
        }
    }

    formatSummary(summary: Angle3DMetricSummaryOutput): Record<string, string | number> {
        return {
            "overall": summary.overallScore,
            ...Object.fromEntries(summary.individualScores.entries())
        }
    }
}
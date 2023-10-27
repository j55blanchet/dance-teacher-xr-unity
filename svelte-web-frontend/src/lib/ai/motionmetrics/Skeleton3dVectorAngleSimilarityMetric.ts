import type { ValueOf } from "$lib/data/dances-store";
import type { Pose3DLandmarkFrame, Pose2DPixelLandmarks } from "$lib/webcam/mediapipe-utils";
import { BodyInnerAnglesComparisons, getInnerAngleFromFrame, GetHarmonicMean, getArraySD } from "../EvaluationCommonUtils";
import type { LiveEvaluationMetric, TrackHistory } from "./MotionMetric";

type AngleComparisonKey = keyof typeof BodyInnerAnglesComparisons;
type AngleComparisonValue = ValueOf<typeof BodyInnerAnglesComparisons>;

function compute3dAngleSimilarity(refLandmarks: Pose3DLandmarkFrame, userLandmarks: Pose3DLandmarkFrame, comparison: AngleComparisonValue) {
    const userInnerAngle = getInnerAngleFromFrame(userLandmarks, comparison.vec1, comparison.vec2);
    const refInnerAngle = getInnerAngleFromFrame(refLandmarks, comparison.vec1, comparison.vec2);
    const angleDiff = Math.abs(userInnerAngle - refInnerAngle);
    const scaledAngleDiff = angleDiff / comparison.rangeOfMotion;
    return { 
        user: userInnerAngle, 
        ref: refInnerAngle, 
        diff: angleDiff,
        diffDegrees: angleDiff * 180 / Math.PI,
        score: (1 - scaledAngleDiff)
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
function computeSkeleton3DVectorAngleSimilarity(refLandmarks: Pose3DLandmarkFrame, userLandmarks: Pose3DLandmarkFrame) {

    const results = Object.fromEntries(
        (Object.entries(BodyInnerAnglesComparisons) as [AngleComparisonKey, AngleComparisonValue][]).map((v) => {
            const [key, comparison] = v;
            return [key, compute3dAngleSimilarity(refLandmarks, userLandmarks, comparison)];
        })
    ) as Record<AngleComparisonKey, ReturnType<typeof compute3dAngleSimilarity>>;

    const meanScore = GetHarmonicMean(Object.values(results).map((r) => r.score));

    return {
        overallScore: meanScore,
        individualScores: results,
    }
}

type Angle3DMetricSingleFrameOutput = ReturnType<typeof computeSkeleton3DVectorAngleSimilarity>;

export type Angle3DMetricSummaryOutput = ReturnType<Skeleton3dVectorAngleSimilarityMetric["summarizeMetric"]>; 

type Angle3DMetricSummaryFormattedOutput = ReturnType<Skeleton3dVectorAngleSimilarityMetric["formatSummary"]>;

export default class Skeleton3dVectorAngleSimilarityMetric implements LiveEvaluationMetric<Angle3DMetricSingleFrameOutput, Angle3DMetricSummaryOutput, Angle3DMetricSummaryFormattedOutput> {
    
    computeMetric(_history: TrackHistory, _metricHistory: Angle3DMetricSingleFrameOutput[], _videoFrameTimeInSecs: number, _actualTimesInMs: number, _user2dPose: Pose2DPixelLandmarks, user3dPose: Pose3DLandmarkFrame, _ref2dPose: Pose2DPixelLandmarks, ref3dPose: Pose3DLandmarkFrame): Angle3DMetricSingleFrameOutput {
        return computeSkeleton3DVectorAngleSimilarity(ref3dPose, user3dPose)
    }

    summarizeMetric(_history: TrackHistory, metricHistory: Angle3DMetricSingleFrameOutput[]) {
        
        const overallScores = metricHistory.map(m => m.overallScore).filter((n) => !isNaN(n));
        const overallMeanScore = GetHarmonicMean(overallScores);
        const overallScoreStdDeviation = getArraySD(overallScores);
        
        const angleSimilarityVectorScoreKeyValues = (Object.keys(BodyInnerAnglesComparisons) as AngleComparisonKey[])
            .map((key) => {
            const vecScores = metricHistory.map((scores) => scores.individualScores[key].score)
                                                      .filter((n) => !isNaN(n));
            const meanScore = GetHarmonicMean(vecScores);
            return [key, meanScore] as const;
        });

        const angleSimilarityIndividualScores = Object.fromEntries(angleSimilarityVectorScoreKeyValues) as Record<AngleComparisonKey, number>;
    
        return {
            overallScore: overallMeanScore,
            overallScoreSD: overallScoreStdDeviation,
            individualScores: angleSimilarityIndividualScores,
            minPossibleScore: 0,
            maxPossibleScore: 1.0,
        }
    }

    formatSummary(summary: Angle3DMetricSummaryOutput) {
        return {
            "overall": summary.overallScore,
            "overallSD": summary.overallScoreSD,
            ...summary.individualScores
        } as const;
    }
}
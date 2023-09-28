

import type { PoseReferenceData } from "$lib/data/dances-store";
import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";
import { UserDanceEvaluator } from "./UserDanceEvaluator";
import type { PerformanceEvaluationTrack } from "./UserEvaluationRecorder";
import { Julien2DSkeletonSimilarityMetric } from "./motionmetrics/Julien2DSkeletonSimilarityMetric";
import { Qijia2DSkeletonSimilarityMetric } from "./motionmetrics/Qijia2DSkeletonSimilarityMetric";
import { Skeleton3dVectorAngleSimilarityMetric } from "./motionmetrics/Skeleton3dVectorAngleSimilarityMetric";
import { BasicInfoSummaryMetric } from "./motionmetrics/BasicInfoSummaryMetric";

const frontendLiveMetrics = {
    qijia2DSkeletonSimilarity: new Qijia2DSkeletonSimilarityMetric(),
    julien2DSkeletonSimilarity: new Julien2DSkeletonSimilarityMetric(),
    skeleton3DAngleSimilarity: new Skeleton3dVectorAngleSimilarityMetric(),
};

const frontendSummaryMetrics = {
    basicInfo: new BasicInfoSummaryMetric(),
};

export type FrontendDanceEvaluator = UserDanceEvaluator<typeof frontendLiveMetrics, typeof frontendSummaryMetrics>;
export type FrontendPerformanceSummary = ReturnType<FrontendDanceEvaluator["generatePerformanceSummary"]>;
export type FrontendLiveEvaluationResult = ReturnType<FrontendDanceEvaluator["evaluateFrame"]>;
export type FrontendEvaluationTrack = PerformanceEvaluationTrack<NonNullable<FrontendLiveEvaluationResult>>;

export function getFrontendDanceEvaluator(
    ref2dPoses: PoseReferenceData<Pose2DPixelLandmarks>,
    ref3dPoses: PoseReferenceData<Pose3DLandmarkFrame>
) {
    
    return new UserDanceEvaluator(
        ref2dPoses,
        ref3dPoses,
        frontendLiveMetrics,
        frontendSummaryMetrics,
    );
}
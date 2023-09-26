

import type { PoseReferenceData } from "$lib/data/dances-store";
import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";
import { UserDanceEvaluator } from "./UserDanceEvaluator";
import type { PerformanceEvaluationTrack } from "./UserEvaluationRecorder";
import { Qijia2DSkeletonSimilarityMetric } from "./evaluationmetrics/Qijia2DSkeletonSimilarityMetric";


const frontendLiveMetrics = {
    qijia2DSkeletonSimilarity: new Qijia2DSkeletonSimilarityMetric(),
};

export type FrontendDanceEvaluator = UserDanceEvaluator<typeof frontendLiveMetrics>;
export type FrontendPerformanceSummary = ReturnType<FrontendDanceEvaluator["getPerformanceSummary"]>;
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
    );
}
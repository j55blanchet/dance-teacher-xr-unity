import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";

export type TrackHistory = {
    videoFrameTimesInSecs: number[],
    actualTimesInMs: number[],
    ref3DFrameHistory: Pose3DLandmarkFrame[],
    ref2DFrameHistory: Pose2DPixelLandmarks[],
    user3DFrameHistory: Pose3DLandmarkFrame[],
    user2DFrameHistory: Pose2DPixelLandmarks[],
}

/**
 * Represents a metric that is calculated as a time series 
 * @type FrameResultType 
 * @type SummaryType 
 */
export interface LiveEvaluationMetric<FrameResultType, SummaryType>{

    computeMetric(
        history: TrackHistory,
        metricHistory: FrameResultType[],
        videoFrameTimeInSecs: number,
        actualTimesInMs: number,
        user2dPose: Pose2DPixelLandmarks,
        user3dPose: Pose3DLandmarkFrame,
        ref2dPose: Pose2DPixelLandmarks,
        ref3dPose: Pose3DLandmarkFrame,
    ): FrameResultType;

    summarizeMetric(
        history: TrackHistory,
        metricHistory: FrameResultType[]
    ): SummaryType;

    formatSummary(
        summary: SummaryType
    ): Record<string, number | string>;
}


export interface SummaryMetric<SummaryType> {
    computeSummaryMetric(
        history: TrackHistory,
    ): SummaryType;

    formatSummary(
        summary: SummaryType
    ): Record<string, number | string>;
}
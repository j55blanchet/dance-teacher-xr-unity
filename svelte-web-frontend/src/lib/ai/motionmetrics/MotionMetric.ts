import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";

export interface SummaryMetric<T> {
    computeSummaryMetric(
        frameTimes: number[],
        ref3DFrames: Pose3DLandmarkFrame[],
        ref2DFrames: Pose2DPixelLandmarks[],
        user3DFrames: Pose3DLandmarkFrame[],
        user2DFrames: Pose2DPixelLandmarks[],
    ): T;
}

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
        metricHistory: number[],
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
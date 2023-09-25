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

/**
 * Represents a metric that is calculated as a time series 
 * @type TimeSeriesType 
 * @type SummaryType 
 */
export interface TimeSeriesMetric<TimeSeriesType,SummaryType>{

    computeMetric(
        frameTimes: number[],
        metricHistory: number[],
        ref3DFrames: Pose3DLandmarkFrame[],
        ref2DFrames: Pose2DPixelLandmarks[],
        user3DFrames: Pose3DLandmarkFrame[],
        user2DFrames: Pose2DPixelLandmarks[],
    ): TimeSeriesType;

    summarizeMetric(
        frameTimes: number[],
        metricHistory: TimeSeriesType[]
    ): SummaryType;
}
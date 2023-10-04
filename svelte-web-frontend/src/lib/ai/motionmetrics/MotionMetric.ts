import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";

export type TrackHistory = {
    videoFrameTimesInSecs: number[],
    actualTimesInMs: number[],
    ref3DFrameHistory: Pose3DLandmarkFrame[],
    ref2DFrameHistory: Pose2DPixelLandmarks[],
    user3DFrameHistory: Pose3DLandmarkFrame[],
    user2DFrameHistory: Pose2DPixelLandmarks[],
};

export interface BaseMetric<SummaryType> {
    
    /**
     * Format the summary object into a 1D row for display in a table & saving to CSV. In particular, 
     * any sub-arraysor sub-objects in the summary object should be either integrated into the 
     * top-level object, or discarded.
     * @param summary The summary object returned by summarizeMetric
     */
    formatSummary(
        summary: Readonly<SummaryType>
    ): Record<string, number | string | null>;
}

/**
 * Represents a metric that is calculated every frame. This can be potentially used for
 * concurrent feedback to the user.
 * @type FrameResultType 
 * @type SummaryType 
 */
export interface LiveEvaluationMetric<FrameResultType, SummaryType> extends BaseMetric<SummaryType>{

    /**
     * Compute the metric for a single frame. The metric is provided a large amount of information
     * through these parameters and it is up to the metric to decide which information it needs. The
     * return values of this function are stored in the metricHistory array, and made available for 
     * future frame calculations and for the summary calculation.
     * 
     * @param history Contains the history of the track up to the current frame
     * @param metricHistory An array of the results of this metric for each frame
     * @param videoFrameTimeInSecs The time of the video frame, in seconds (operates at video speed)
     * @param actualTimesInMs Timestamp of when the frame was processed (operates at real time speed)
     * @param user2dPose 2D pose of the user
     * @param user3dPose 3D pose of the user
     * @param ref2dPose 2D pose of the reference dancer
     * @param ref3dPose 3D pose of the reference dancer
     */
    computeMetric(
        history: Readonly<TrackHistory>,
        metricHistory: Readonly<FrameResultType[]>,
        videoFrameTimeInSecs: number,
        actualTimesInMs: number,
        user2dPose: Readonly<Pose2DPixelLandmarks>,
        user3dPose: Readonly<Pose3DLandmarkFrame>,
        ref2dPose: Readonly<Pose2DPixelLandmarks>,
        ref3dPose: Readonly<Pose3DLandmarkFrame>,
    ): FrameResultType;

    /**
     * Summarize the metric for the entire track. This is called after the track has been fully
     * processed, and is used to generate the aggregate metrics, final scores, and the like.
     * @param history Contains the history of the track for the entire segment
     * @param metricHistory The array of results of this metric for each frame
     */
    summarizeMetric(
        history: Readonly<TrackHistory>,
        metricHistory: Readonly<FrameResultType[]>
    ): SummaryType;
}

/**
 * A metric that is calculated once for the entire track. This is useful for metrics that require
 * the entire track to be processed before they can be calculated, or those that will not be used
 * for concurrent feedback
 */
export interface SummaryMetric<SummaryType> extends BaseMetric<SummaryType>{

    /**
     * Compute the metric for the entire track. This is called after the track has been fully
     * processed, and is used to generate the aggregate metrics, final scores, and the like.
     * @param history Contains the history of the track for the entire segment
     */
    summarizeMetric(
        history: TrackHistory,
    ): SummaryType;
}
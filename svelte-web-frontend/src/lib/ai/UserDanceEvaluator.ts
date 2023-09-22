import type { PoseReferenceData } from "$lib/data/dances-store";
import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from  "$lib/webcam/mediapipe-utils";
import type { LiveEvaluationMetric, SummaryMetric } from "./motionmetrics/MotionMetric";
import { UserEvaluationRecorder } from "./UserEvaluationRecorder";
import { calculateSDJerks, removeDuplicateFrameTimes } from "./compute-motion-descriptors";

/**
 * Evaluates a user's dance performance against a reference dance. This class is responsible for
 * computing the metrics for each frame, and for computing the summary metrics for the entire dance.
 * The metrics are provided by the caller, and can be any metric that implements the 
 * LiveEvaluationMetric or SummaryMetric interfaces. As such, this class is generic over the types 
 * of the live and summary metrics.
 */
export default class UserDanceEvaluator<
    T extends Record<string, LiveEvaluationMetric<unknown, unknown>>,
    U extends Record<string, SummaryMetric<unknown>>,
> {
    public recorder = new 
        UserEvaluationRecorder<
            {[K in keyof T]: ReturnType<T[K]["computeMetric"]>}
        >();

    constructor(
        private reference2DData: PoseReferenceData<Pose2DPixelLandmarks>, 
        private reference3DData: PoseReferenceData<Pose3DLandmarkFrame>,
        private liveMetrics: T,
        private summaryMetrics: U,
    ) {};

    /**
     * Evaluates a single frame of a user's dance performance.
     * @param trialId Identifier of the current attempt, used to separate recordings into tracks
     * @param danceRelativeStem Identifier of the dance which is being evaluated
     * @param videoTimeSecs Timestamp of the video, in seconds
     * @param actualTimeMs Actual time this pose was captured, in milliseconds
     * @param userPose2D User's pose at the given frame time
     * @param userPose3D User's pose at the given frame time
     * @param disableRecording If true, the evaluation will not be recorded in the evaluation history
     */
    evaluateFrame(
        trialId: string, 
        danceRelativeStem: string, 
        segmentDescription: string, 
        videoTimeSecs: number, 
        actualTimeMs: number, 
        userPose2D: Pose2DPixelLandmarks, 
        userPose3D: Pose3DLandmarkFrame,
        disableRecording = false) {

        const referencePose2D = this.reference2DData.getReferencePoseAtTime(videoTimeSecs);
        const referencePose3D = this.reference3DData.getReferencePoseAtTime(videoTimeSecs);
        if (!referencePose2D || !referencePose3D) {
            return null;
        }
        
        if (!disableRecording && !this.recorder.tracks.has(trialId)) {
            this.recorder.startNewTrack(trialId, danceRelativeStem, segmentDescription);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const track = this.recorder.tracks.get(trialId)

        
        const liveMetricKeys = Object.keys(this.liveMetrics) as (keyof T)[];
        const metricResults = Object.fromEntries(liveMetricKeys.map((liveMetricKey) => {
            const metric = this.liveMetrics[liveMetricKey];

            return [liveMetricKey, (metric).computeMetric(
                {
                    videoFrameTimesInSecs: track?.videoFrameTimesInSecs ?? [],
                    actualTimesInMs: track?.actualTimesInMs ?? [],
                    ref3DFrameHistory: track?.ref3dPoses ?? [],
                    ref2DFrameHistory: track?.ref2dPoses ?? [],
                    user3DFrameHistory: track?.user3dPoses ?? [],
                    user2DFrameHistory: track?.user2dPoses ?? [],
                },
                (track?.timeSeriesResults?.[liveMetricKey] ?? []) as any,
                videoTimeSecs,
                actualTimeMs,
                userPose2D,
                userPose3D,
                referencePose2D,
                referencePose3D,
            )]
        })) as {[K in keyof T]: ReturnType<T[K]["computeMetric"]>};

        if (!disableRecording) {
            this.recorder.recordEvaluationFrame(
                trialId,
                videoTimeSecs,
                actualTimeMs,
                userPose2D,
                userPose3D,
                referencePose3D,
                referencePose2D,
                metricResults,
            )
        }
        return metricResults;
    }

    /**
     * Generates a summary of the performance for a given track. This summary is computed from the
     * live metrics and summary metrics provided to the constructor.
     * @param id Id of the track to get the performance summary for
     * @returns Performance summary for the given track, accululated from the live metrics and
     * summary metrics provided to the constructor.
     */
    generatePerformanceSummary(id: string) {

        const track = this.recorder.tracks.get(id)
        if (!track) {
            return null;
        }

        const liveMetricKeys = Object.keys(this.liveMetrics) as (keyof T)[];

        const trackHistory = {
            videoFrameTimesInSecs: track.videoFrameTimesInSecs,
            actualTimesInMs: track.actualTimesInMs,
            ref3DFrameHistory: track.ref3dPoses,
            ref2DFrameHistory: track.ref2dPoses,
            user3DFrameHistory: track.user3dPoses,
            user2DFrameHistory: track.user2dPoses,
        };

        const liveMetricSummaryResults = Object.fromEntries(liveMetricKeys.map((liveMetricKey) => {
            const metric = this.liveMetrics[liveMetricKey];
            return [liveMetricKey, (metric).summarizeMetric(
                trackHistory,
                (track.timeSeriesResults?.[liveMetricKey] ?? []) as any,
            )]
        })) as {[K in keyof T]: ReturnType<T[K]["summarizeMetric"]>};
                
        const summaryMetricKeys = Object.keys(this.summaryMetrics) as (keyof U)[];
        const summaryMetricResults = Object.fromEntries(summaryMetricKeys.map((summaryMetricKey) => {
            const metric = this.summaryMetrics[summaryMetricKey];
            return [summaryMetricKey, (metric).summarizeMetric(
                trackHistory,
            )]
        })) as {[K in keyof U]: ReturnType<U[K]["summarizeMetric"]>};

        return {
            ...liveMetricSummaryResults,
            ...summaryMetricResults
        }
    }
}


import type { PoseReferenceData } from "$lib/data/dances-store";
import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from  "$lib/webcam/mediapipe-utils";
import type { LiveEvaluationMetric, SummaryMetric } from "./motionmetrics/MotionMetric";
import { UserEvaluationRecorder } from "./UserEvaluationRecorder";

/**
 * Evaluates a user's dance performance against a reference dance.
 */
export class UserDanceEvaluator<
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

        // const { 
        //     overallScore: qijiaOverallScore,
        //     vectorByVectorScore: qijiaByVectorScores
        //  } = computeSkeletonDissimilarityQijiaMethod(
        //     referencePose2D, 
        //     userPose2D
        // )

        // const {
        //     overallScore: julienOverallScore,
        //     vectorByVectorScores: julienByVectorScores,
        // } = computeSkeleton2DDissimilarityJulienMethod(
        //     referencePose2D,
        //     userPose2D
        // )

        // const { 
        //     overallScore: angleSimilarity3DOverallScore,
        //     individualScores: angleSimilarity3DByVectorScores,
        // } = computeSkeleton3DVectorAngleSimilarity(referencePose3D, userPose3D)

        // const evaluationResult = { 
        //     // qijiaOverallScore,
        //     // qijiaByVectorScores,
        //     julienOverallScore,
        //     julienByVectorScores,
        //     angleSimilarity3DOverallScore,
        //     angleSimilarity3DByVectorScores,
        //  }

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

    getPerformanceSummary(id: string) {

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
            return [summaryMetricKey, (metric).computeSummaryMetric(
                trackHistory,
            )]
        })) as {[K in keyof U]: ReturnType<U[K]["computeSummaryMetric"]>};

        return {
            ...liveMetricSummaryResults,
            ...summaryMetricResults
        }
    }
}
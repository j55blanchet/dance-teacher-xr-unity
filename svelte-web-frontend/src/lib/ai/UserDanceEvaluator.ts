import type { PoseReferenceData } from "$lib/data/dances-store";
import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from  "$lib/webcam/mediapipe-utils";
import type { LiveEvaluationMetric } from "./motionmetrics/MotionMetric";
import { UserEvaluationRecorder } from "./UserEvaluationRecorder";

/**
 * Evaluates a user's dance performance against a reference dance.
 */
export class UserDanceEvaluator<
    T extends Record<string, LiveEvaluationMetric<unknown, unknown>>,
> {
    public recorder = new 
        UserEvaluationRecorder<
            {[K in keyof T]: ReturnType<T[K]["computeMetric"]>}
        >();

    constructor(
        private reference2DData: PoseReferenceData<Pose2DPixelLandmarks>, 
        private reference3DData: PoseReferenceData<Pose3DLandmarkFrame>,
        private liveMetrics: T,
    ) {};

    /**
     * Evaluates a single frame of a user's dance performance.
     * @param trialId Identifier of the current attempt, used to separate recordings into tracks
     * @param videoTimeSecs Timestamp of the video, in seconds
     * @param actualTimeMs Actual time this pose was captured, in milliseconds
     * @param userPose2D User's pose at the given frame time
     */
    evaluateFrame(trialId: string, videoTimeSecs: number, actualTimeMs: number, userPose2D: Pose2DPixelLandmarks, userPose3D: Pose3DLandmarkFrame) {

        const referencePose2D = this.reference2DData.getReferencePoseAtTime(videoTimeSecs);
        const referencePose3D = this.reference3DData.getReferencePoseAtTime(videoTimeSecs);
        if (!referencePose2D || !referencePose3D) {
            return null;
        }
        
        if (!this.recorder.tracks.has(trialId)) {
            this.recorder.startNewTrack(trialId);
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const track = this.recorder.tracks.get(trialId)!

        
        const liveMetricKeys = Object.keys(this.liveMetrics) as (keyof T)[];
        const metricResults = Object.fromEntries(liveMetricKeys.map((liveMetricKey) => {
            const metric = this.liveMetrics[liveMetricKey];
            return [liveMetricKey, (metric).computeMetric(
                {
                    videoFrameTimesInSecs: track.videoFrameTimesInSecs,
                    actualTimesInMs: track.actualTimesInMs,
                    ref3DFrameHistory: track.ref3dPoses,
                    ref2DFrameHistory: track.ref2dPoses,
                    user3DFrameHistory: track.user3dPoses,
                    user2DFrameHistory: track.user2dPoses,
                },
                (track.timeSeriesResults?.[liveMetricKey] ?? []) as any,
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
        return metricResults;
    }

    getPerformanceSummary(id: string) {

        const track = this.recorder.tracks.get(id)
        if (!track) {
            return null;
        }

        const liveMetricKeys = Object.keys(this.liveMetrics) as (keyof T)[];
        const metricSummaryResults = Object.fromEntries(liveMetricKeys.map((liveMetricKey) => {
            const metric = this.liveMetrics[liveMetricKey];
            return [liveMetricKey, (metric).summarizeMetric(
                {
                    videoFrameTimesInSecs: track.videoFrameTimesInSecs,
                    actualTimesInMs: track.actualTimesInMs,
                    ref3DFrameHistory: track.ref3dPoses,
                    ref2DFrameHistory: track.ref2dPoses,
                    user3DFrameHistory: track.user3dPoses,
                    user2DFrameHistory: track.user2dPoses,
                },
                (track.timeSeriesResults?.[liveMetricKey] ?? []) as any,
            )]
        })) as {[K in keyof T]: ReturnType<T[K]["summarizeMetric"]>};
                
        const frameCount = track.videoFrameTimesInSecs.length
        const realtimeDurationSecs = (track.actualTimesInMs[frameCount - 1] - track.actualTimesInMs[0]) / 1000
        const danceTimeDurationSecs = track.videoFrameTimesInSecs[frameCount - 1] - track.videoFrameTimesInSecs[0]
        const danceTimeFps = frameCount / danceTimeDurationSecs
        const realTimeFps = frameCount / realtimeDurationSecs

        return {
            frameCount,
            danceTimeDurationSecs,
            realtimeDurationSecs,
            danceTimeFps,
            realTimeFps,
            // qijiaOverallScore,
            // qijiaByVectorScores,
            // julienOverallScore,
            // julienByVectorScores,
            // angleSimilarityOverallScore,
            // angleSimilarityByVectorScores,
            ...metricSummaryResults,
        }
    }
}
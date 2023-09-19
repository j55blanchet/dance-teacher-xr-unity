import type { PoseReferenceData } from "$lib/data/dances-store";
import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from  "$lib/webcam/mediapipe-utils";
import { QijiaMethodComparisionVectorNames, QijiaMethodComparisonVectors, getArrayMean } from './EvaluationCommonUtils';
import { computeSkeleton2DDissimilarityJulienMethod, computeSkeleton3DVectorAngleSimilarity, computeSkeletonDissimilarityQijiaMethod } from "./skeleton-similarity";
import { UserEvaluationRecorder } from "./UserEvaluationRecorder";

// Type definition for the result of evaluating a user's performance.
export type EvaluationV1Result = NonNullable<ReturnType<UserDanceEvaluatorV1["evaluateFrame"]>>;

/**
 * Evaluates a user's dance performance against a reference dance.
 */
export class UserDanceEvaluatorV1 {

    public recorder = new UserEvaluationRecorder<EvaluationV1Result>();

    constructor(
        private reference2DData: PoseReferenceData<Pose2DPixelLandmarks>, 
        private reference3DData: PoseReferenceData<Pose3DLandmarkFrame>
    ) {};

    /**
     * Evaluates a single frame of a user's dance performance.
     * @param trialId Identifier of the current attempt, used to separate recordings into tracks
     * @param frameTime Frame time in seconds
     * @param userPose2D User's pose at the given frame time
     */
    evaluateFrame(trialId: string, frameTime: number, userPose2D: Pose2DPixelLandmarks, userPose3D: Pose3DLandmarkFrame) {

        const referencePose2D = this.reference2DData.getReferencePoseAtTime(frameTime);
        const referencePose3D = this.reference3DData.getReferencePoseAtTime(frameTime);
        if (!referencePose2D || !referencePose3D) {
            return null;
        }

        const { 
            overallScore: qijiaOverallScore,
            vectorByVectorScore: qijiaByVectorScores
         } = computeSkeletonDissimilarityQijiaMethod(
            referencePose2D, 
            userPose2D
        )

        const {
            overallScore: julienOverallScore,
            vectorByVectorScores: julienByVectorScores,
        } = computeSkeleton2DDissimilarityJulienMethod(
            referencePose2D,
            userPose2D
        )

        const { 
            overallScore: angleSimilarity3DOverallScore,
            vectorByVectorScores: angleSimilarity3DByVectorScores,
        } = computeSkeleton3DVectorAngleSimilarity(referencePose3D, userPose3D)

        const evaluationResult = { 
            qijiaOverallScore,
            qijiaByVectorScores,
            julienOverallScore,
            julienByVectorScores,
            angleSimilarity3DOverallScore,
            angleSimilarity3DByVectorScores,
         }

        this.recorder.recordEvaluationFrame(
            trialId,
            frameTime,
            userPose2D,
            evaluationResult
        )
        return evaluationResult;
    }

    getPerformanceSummary(id: string) {

        const track = this.recorder.tracks.get(id)
        if (!track) {
            return null;
        }

        const vectorScoreKeyValues = QijiaMethodComparisonVectors.map((vec, i) => {
            const key = QijiaMethodComparisionVectorNames[i];
            const vecScores = track.evaluation.qijiaByVectorScores.map((scores) => scores[i]);
            const meanScore = getArrayMean(vecScores);
            return [key, meanScore] as [string, number];
        });

        // const evaluationKeys = Object.keys(track.evaluation) as Array<keyof EvaluationV1>
        
        const qijiaOverallScore = getArrayMean(track.evaluation.qijiaOverallScore);
        const qijiaByVectorScores = new Map(vectorScoreKeyValues)
        
        // evaluationKeys.reduce((summary, key) => {
        //     const sumOfMetric = track.evaluation[key].reduce((runningTotal, frameValue) => runningTotal + frameValue, 0)
        //     summary[key] = sumOfMetric / track.evaluation[key].length
        //     return summary
        // }, {} as Record<string, number>)

        const julienOverallScore = getArrayMean(track.evaluation.julienOverallScore);
        const julienVectorScoreKeyValues = QijiaMethodComparisonVectors.map((vec, i) => {
            const key = QijiaMethodComparisionVectorNames[i];
            const vecScores = track.evaluation.julienByVectorScores.map((scores) => scores[i].score);
            const meanScore = getArrayMean(vecScores);
            return [key, meanScore] as [string, number];
        });
        const julienByVectorScores = new Map(julienVectorScoreKeyValues)

        const angleSimilarityOverallScore = getArrayMean(track.evaluation.angleSimilarity3DOverallScore);
        const angleSimilarityVectorScoreKeyValues = QijiaMethodComparisonVectors.map((vec, i) => {
            const key = QijiaMethodComparisionVectorNames[i];
            const vecScores = track.evaluation.angleSimilarity3DByVectorScores.map((scores) => scores[i]);
            const meanScore = getArrayMean(vecScores);
            return [key, meanScore] as [string, number];
        });
        const angleSimilarityByVectorScores = new Map(angleSimilarityVectorScoreKeyValues)
        
        const frameCount = track.frameTimes.length
        const realtimeDurationSecs = (track.recordTimesMs[frameCount - 1] - track.recordTimesMs[0]) / 1000
        const danceTimeDurationSecs = track.frameTimes[frameCount - 1] - track.frameTimes[0]
        const danceTimeFps = frameCount / danceTimeDurationSecs
        const realTimeFps = frameCount / realtimeDurationSecs

        return {
            frameCount,
            danceTimeDurationSecs,
            realtimeDurationSecs,
            danceTimeFps,
            realTimeFps,
            qijiaOverallScore,
            qijiaByVectorScores,
            julienOverallScore,
            julienByVectorScores,
            angleSimilarityOverallScore,
            angleSimilarityByVectorScores,
        }
    }
}
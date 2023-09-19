import type { Pose2DReferenceData } from "$lib/dances-store";
import type { Pose2DPixelLandmarks } from  "$lib/webcam/mediapipe-utils";
import { QijiaMethodComparisionVectorNames, QijiaMethodComparisonVectors, getArrayMean } from './EvaluationCommonUtils';
import { computeSkeleton2DDissimilarityJulienMethod, computeSkeletonDissimilarityQijiaMethod } from "./skeleton-similarity";
import { UserEvaluationRecorder } from "./UserEvaluationRecorder";
import { calculateSDJerks } from "./compute-motion-descriptors";

// Type definition for the result of evaluating a user's performance.
export type EvaluationV1Result = NonNullable<ReturnType<UserDanceEvaluatorV1["evaluateFrame"]>>;

/**
 * Evaluates a user's dance performance against a reference dance.
 */
export class UserDanceEvaluatorV1 {

    public recorder = new UserEvaluationRecorder<EvaluationV1Result>();
    constructor(private referenceData: Pose2DReferenceData) {
    };

    /**
     * Evaluates a single frame of a user's dance performance.
     * @param trialId Identifier of the current attempt, used to separate recordings into tracks
     * @param frameTime Frame time in seconds
     * @param userPose User's pose at the given frame time
     */
    evaluateFrame(trialId: string, frameTime: number, userPose: Pose2DPixelLandmarks) {

        const referencePose = this.referenceData.getReferencePoseAtTime(frameTime);
        if (!referencePose) {
            return null;
        }

        const [qijiaOverallScore, qijiaByVectorScores] = computeSkeletonDissimilarityQijiaMethod(
            referencePose, 
            userPose
        )

        const julienScore = computeSkeleton2DDissimilarityJulienMethod(
            referencePose,
            userPose
        )

        const evaluationResult = { 
            qijiaOverallScore,
            qijiaByVectorScores,
            julienScore: julienScore.score,
            julienByVectorInfo: julienScore.infoByVetor
         }

        this.recorder.recordEvaluationFrame(
            trialId,
            frameTime,
            userPose,
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

        const julienOverallScore = getArrayMean(track.evaluation.julienScore);
        const julienVectorScoreKeyValues = QijiaMethodComparisonVectors.map((vec, i) => {
            const key = QijiaMethodComparisionVectorNames[i];
            const vecScores = track.evaluation.julienByVectorInfo.map((scores) => scores[i].score);
            const meanScore = getArrayMean(vecScores);
            return [key, meanScore] as [string, number];
        });

        const sdJerks = calculateSDJerks(track.userPoses, this.referenceData.get2DLandmarks(track.frameTimes), track.frameTimes);


        const julienByVectorScores = new Map(julienVectorScoreKeyValues)
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
            sdJerks
        }
    }
}


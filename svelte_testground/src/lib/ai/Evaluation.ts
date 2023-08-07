import type { Pose2DReferenceData } from "$lib/dances-store";
import { type Pose2DPixelLandmarks, PoseLandmarkIds } from "$lib/mediapipe-utils";

const ComparisonVectors = Object.freeze([
    [PoseLandmarkIds.leftShoulder,  PoseLandmarkIds.rightShoulder],
    [PoseLandmarkIds.leftShoulder,  PoseLandmarkIds.leftHip],
    [PoseLandmarkIds.leftHip,       PoseLandmarkIds.rightHip],
    [PoseLandmarkIds.rightHip,      PoseLandmarkIds.rightShoulder],
    [PoseLandmarkIds.leftShoulder,  PoseLandmarkIds.leftElbow],
    [PoseLandmarkIds.leftElbow,     PoseLandmarkIds.leftWrist],
    [PoseLandmarkIds.rightShoulder, PoseLandmarkIds.rightElbow],
    [PoseLandmarkIds.rightElbow,    PoseLandmarkIds.rightWrist]
])

function GetNormalizedVector(
    pixelLandmarks: Pose2DPixelLandmarks,
    srcLandmark: number,
    destLandmark: number, 
){
    // TODO: utilize a vector arithmetic library?
    const {x: sx, y: sy } = pixelLandmarks[srcLandmark]
    const mag = Math.pow(Math.pow(sx, 2) + Math.pow(sy, 2), 0.5)
    return [sx / mag, sy / mag]
}

export function computeSkeleton2DSimilarityJulienMethod(
    refLandmarks: Pose2DPixelLandmarks,
    userLandmarks: Pose2DPixelLandmarks
) {
    let score = 0

    return score
}

/**
 * 
 * @param refLandmarks Reference landmarks (expert)
 * @param userLandmarks Evaluation landmarks (learner)
 * @returns A score between 0 and 5, where 0 is the worst and 5 is the best
 */
export function computeSkeletonDissimilarityQijiaMethod(
    refLandmarks: Pose2DPixelLandmarks, 
    userLandmarks: Pose2DPixelLandmarks
): [number, number] {

    // From the paper: 
    //     At each frame, we compute the absolute difference be-
    // tween the corresponding unit vectors of the learner and the
    // expert, and then sum them up as the per-frame dancing error.
    // The overall dancing error is calculated as the average of all
    // frames of the dance. Finally, we scale the score into the range
    // of [0, 5], where 0 denotes the poorest performance and 5 rep-
    // resents the best performance. This normalized score serves
    // as the final performance rating.
    let rawDissimilarityScore = 0

    // Compare 8 Vectors
    for(const vecLandmarkIds of ComparisonVectors) {
        const [srcLandmark, destLandmark] = vecLandmarkIds
        const [refX, refY] = GetNormalizedVector(refLandmarks, srcLandmark, destLandmark)
        const [usrX, usrY] = GetNormalizedVector(userLandmarks, srcLandmark, destLandmark)
        const [dx, dy] = [refX - usrX, refY - usrY]
        rawDissimilarityScore += Math.abs(dx) || 0
        rawDissimilarityScore += Math.abs(dy) || 0
    }

    const USER_STUDY_DISSIMILARITY_UPPER_BOUND = 18.0
    const USER_STUDY_DISSIMILARITY_LOWER_BOUND = 15.0
    const USER_STUDY_DISSIMILARITY_RANGE = USER_STUDY_DISSIMILARITY_UPPER_BOUND - USER_STUDY_DISSIMILARITY_LOWER_BOUND

    const TARGET_UPPER_BOUND_SCORE = 5.0
    const TARGET_LOWER_BOUND_SCORE = 0.0
    const TARGET_SCORE_RANGE = TARGET_UPPER_BOUND_SCORE - TARGET_LOWER_BOUND_SCORE
    
    const percentileDisimilarity = (rawDissimilarityScore - USER_STUDY_DISSIMILARITY_LOWER_BOUND) / USER_STUDY_DISSIMILARITY_RANGE
    const scaledScore = TARGET_UPPER_BOUND_SCORE - (TARGET_SCORE_RANGE) * percentileDisimilarity 

    return [rawDissimilarityScore, scaledScore];
}

export type PerformanceEvaluationTrack<EvaluationType> = {
    creationDate: Date;
    frameTimes: number[];
    userPoses: Pose2DPixelLandmarks[];
    evaluation: ArrayVersions<EvaluationType>;
}

type ArrayVersions<T> = {
    [K in keyof T]: T[K][];
}

export class UserEvaluationRecorder<EvaluationType extends Record<string, any>> {

    public tracks: Map<string, PerformanceEvaluationTrack<EvaluationType>> = new Map();

    recordEvaluationFrame(id: string, frameTime: number, userPose: Pose2DPixelLandmarks, evaluationResult: EvaluationType) {
        const evaluationkeys = Object.keys(evaluationResult) as Array<keyof EvaluationType>

        if(!this.tracks.has(id)) {
            this.tracks.set(id, {
                creationDate: new Date(),
                frameTimes: [],
                userPoses: [],
                evaluation: evaluationkeys.reduce((acc, key) => {
                    acc[key] = []
                    return acc
                }, {} as ArrayVersions<EvaluationType>)
            })
        }

        const lastFrameTime = this.tracks.get(id)?.frameTimes.slice(-1)[0] ?? -Infinity
        if (frameTime <= lastFrameTime) {
            throw new Error("Frame time must be increasing")
        }

        const track = this.tracks.get(id)!
        track.frameTimes.push(frameTime)
        track.userPoses.push(userPose)

        for(const key of evaluationkeys) {
            track.evaluation[key].push(evaluationResult[key])
        }
    }
}

/**
 * Evaluates a user's dance performance against a reference dance.
 */
export class UserDanceEvaluator {

    public recorder = new UserEvaluationRecorder<{
        rawQijiaDissimilarityScore: number;
        qijiaPerformanceScore: number;
        julienScore: number;
    }>();

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
            this.recorder.recordEvaluationFrame(
                trialId,
                frameTime, 
                userPose,
                {
                    rawQijiaDissimilarityScore: NaN,
                    qijiaPerformanceScore: NaN,
                    julienScore: NaN
                }
            )
            return;
        }

        const [rawQijiaDissimilarityScore, qijiaScaledScore] = computeSkeletonDissimilarityQijiaMethod(
            referencePose, 
            userPose
        )

        this.recorder.recordEvaluationFrame(
            trialId,
            frameTime,
            userPose,
            { 
                rawQijiaDissimilarityScore,
                qijiaPerformanceScore: qijiaScaledScore,
                julienScore: NaN
             }
        )
    }
}

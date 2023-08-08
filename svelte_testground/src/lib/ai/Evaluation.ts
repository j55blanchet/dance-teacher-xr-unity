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

function getMagnitude(v: [number, number]) {
    return Math.pow(Math.pow(v[0], 2) + Math.pow(v[1], 2), 0.5)
}

function GetNormalizedVector(
    pixelLandmarks: Pose2DPixelLandmarks,
    srcLandmark: number,
    destLandmark: number, 
){
    // TODO: utilize a vector arithmetic library?
    const {x: sx, y: sy } = pixelLandmarks[srcLandmark]
    const {x: dx, y: dy } = pixelLandmarks[destLandmark]
    const [vec_x, vec_y] = [dx - sx, dy - sy]
    const mag = getMagnitude([vec_x, vec_y]);
    return [vec_x / mag, vec_y / mag]
}

export function computeSkeleton2DSimilarityJulienMethod(
    refLandmarks: Pose2DPixelLandmarks,
    userLandmarks: Pose2DPixelLandmarks
) {
    let score = 0

    // Idea: 2D vector comparison should look at both angle and magnitude, since angle
    //       changes are only meaningful when a vectors is perpendicular to the camera.
    //         > When both vectors are orthogonal to the camera, the angle between them is
    //           the primary metric for similarity.
    //         > When one or both vectors are parallel to the camera, the magnitude of the
    //           vectors is the primary metric for similarity. (we don't want to compare angles in this case,
    //           because slight changes in angle can result in large changes in the normalized 2D projection 
    //           of the vector).
    //         > We can scale the relative constribution of each of these similarity metrics based on the
    //           current 2D magnitude of the vectors relative to the maximum observed length of that vector.

    // Another idea: Mediapipe includes an approximate z-value for each landmark. We can use this
    //               to simply compute angle changes in 3D space. This is a simpler approach, but
    //               should work so long as mediapipe's z-values are accurate enough.

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
        rawDissimilarityScore += getMagnitude([dx, dy]) || 0
    }

    // According to Qijia, from our user studies we found that the upperbound dissimilarity score was 2.5
    // and the lower bound was zero. This is the average over an entire dance, so the by-frame score may be
    // higher, or lower. If a user's dissimilarity score was closer to 0, they did well, and if it was closer
    // to 2.5, they did poorly. (These specific numbers are not mentioned in the paper). 
    const USER_STUDY_DISSIMILARITY_UPPER_BOUND = 2.5
    const USER_STUDY_DISSIMILARITY_LOWER_BOUND = 0.0
    const USER_STUDY_DISSIMILARITY_RANGE = USER_STUDY_DISSIMILARITY_UPPER_BOUND - USER_STUDY_DISSIMILARITY_LOWER_BOUND

    // We want to scale the score to a [0...5] range
    const TARGET_UPPER_BOUND_SCORE = 5.0
    const TARGET_LOWER_BOUND_SCORE = 0.0
    const TARGET_SCORE_RANGE = TARGET_UPPER_BOUND_SCORE - TARGET_LOWER_BOUND_SCORE
    
    // First, normalize the score to a [0...1] range, where 0 is the best and 1 is the worst
    const percentileDisimilarity = (rawDissimilarityScore - USER_STUDY_DISSIMILARITY_LOWER_BOUND) / USER_STUDY_DISSIMILARITY_RANGE

    // Then, scale the score to the target range (negating, since we want 0 to be the worst and 5 to be the best)
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


type EvaluationV1 = {
    rawQijiaDissimilarityScore: number;
    qijiaPerformanceScore: number;
    julienScore: number;
};

/**
 * Evaluates a user's dance performance against a reference dance.
 */
export class UserDanceEvaluator {

    public recorder = new UserEvaluationRecorder<EvaluationV1>();

    constructor(private referenceData: Pose2DReferenceData) {
    };

    /**
     * Evaluates a single frame of a user's dance performance.
     * @param trialId Identifier of the current attempt, used to separate recordings into tracks
     * @param frameTime Frame time in seconds
     * @param userPose User's pose at the given frame time
     */
    evaluateFrame(trialId: string, frameTime: number, userPose: Pose2DPixelLandmarks) {

        // TODO: consider flipping the user pose, in case the user is mirroring the 
        //       reference dance.
        
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

        const julienScore = computeSkeleton2DSimilarityJulienMethod(
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
                julienScore: julienScore
             }
        )
    }

    getPerformanceSummary(id: string) {
        const track = this.recorder.tracks.get(id)!
        if (!track) {
            return null;
        }

        const evaluationKeys = Object.keys(track.evaluation) as Array<keyof EvaluationV1>
        const performanceSummary = evaluationKeys.reduce((summary, key) => {
            const sumOfMetric = track.evaluation[key].reduce((runningTotal, frameValue) => runningTotal + frameValue, 0)
            summary[key] = sumOfMetric / track.evaluation[key].length
            return summary
        }, {} as EvaluationV1)

        return performanceSummary
    }
}

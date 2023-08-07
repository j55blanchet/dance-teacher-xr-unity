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

export function compareSkeletons2DVector(
    refLandmarks: Pose2DPixelLandmarks, 
    userLandmarks: Pose2DPixelLandmarks
): number {

    let dissimilarityScore = 0

    // Compare 8 Vectors
    for(const vecLandmarkIds of ComparisonVectors) {
        const [srcLandmark, destLandmark] = vecLandmarkIds
        const [refX, refY] = GetNormalizedVector(refLandmarks, srcLandmark, destLandmark)
        const [usrX, usrY] = GetNormalizedVector(userLandmarks, srcLandmark, destLandmark)
        const [dx, dy] = [refX - usrX, refY - usrY]
        dissimilarityScore += Math.abs(dx) || 0
        dissimilarityScore += Math.abs(dy) || 0
    }

    return dissimilarityScore;
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
        dissimilarityScore: number;
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
                {dissimilarityScore: Infinity}
            )
            return;
        }

        const dissimilarityScore = compareSkeletons2DVector(
            referencePose, 
            userPose
        )

        this.recorder.recordEvaluationFrame(
            trialId,
            frameTime,
            userPose,
            { dissimilarityScore }
        )
    }
}

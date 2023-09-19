import type { Pose2DPixelLandmarks } from "$lib/webcam/mediapipe-utils";

// Type definition for a performance evaluation track.
export type PerformanceEvaluationTrack<EvaluationType> = {
    creationDate: Date;
    frameTimes: number[];
    recordTimesMs: number[];
    userPoses: Pose2DPixelLandmarks[];
    evaluation: ArrayVersions<EvaluationType>;
}

// Used to represent evaluation data.
type ArrayVersions<T> = {
    [K in keyof T]: T[K][];
}

/**
 * Class for recording user performance evaluations.
 * @template EvaluationType - The type of evaluation data to be recorded.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class UserEvaluationRecorder<EvaluationType extends Record<string, any>> {

    public tracks: Map<string, PerformanceEvaluationTrack<EvaluationType>> = new Map();

    /**
     * Records a frame of user performance evaluation.
     * @param id - Identifier of the current attempt, used to separate recordings into tracks
     * @param frameTime - Frame time in seconds
     * @param userPose - User's pose at the given frame time
     * @param evaluationResult - Result of the evaluation for this frame
     */
    recordEvaluationFrame(id: string, frameTime: number, userPose: Pose2DPixelLandmarks, evaluationResult: EvaluationType) {
        const evaluationkeys = Object.keys(evaluationResult) as Array<keyof EvaluationType>

        let track: PerformanceEvaluationTrack<EvaluationType>

        if(!this.tracks.has(id)) {
            track = {
                creationDate: new Date(),
                frameTimes: [],
                recordTimesMs: [],
                userPoses: [],
                evaluation: evaluationkeys.reduce((acc, key) => {
                    acc[key] = []
                    return acc
                }, {} as ArrayVersions<EvaluationType>)
            }
            this.tracks.set(id, track)
        } else {
            // We know the track exists, since we just checked it
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            track = this.tracks.get(id)!
        }

        const lastFrameTime = this.tracks.get(id)?.frameTimes.slice(-1)[0] ?? -Infinity
        if (frameTime < lastFrameTime) {
            throw new Error("Frame time must be increasing")
        }

        
        track.frameTimes.push(frameTime)
        track.recordTimesMs.push(new Date().getTime());
        track.userPoses.push(userPose)

        for(const key of evaluationkeys) {
            track.evaluation[key].push(evaluationResult[key])
        }
    }
}
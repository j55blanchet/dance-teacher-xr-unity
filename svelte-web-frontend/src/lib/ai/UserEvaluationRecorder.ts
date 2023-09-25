import { PoseLandmarkKeys, type Pose2DPixelLandmarks, type Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";
import Papa from "papaparse";

/**
 * For some object T, this type retains the same keys
 * but replaces each value with an array containing the same type. 
 */
type ArrayVersions<T> = {
    [K in keyof T]: T[K][];
}

/**
 * Turn a camelCased string into CAPITALIZED_SNAKE_CASE. This will insert an underscore
 * before each capital letter in the inptu string, then turn every letter to uppercase.
 * @param camelCaseString Input camelCase string
 * @returns CAPITALIZED_SNAKE_CASE version of the string
 */
function camelCaseToCAPITALIZED_SNAKE_CASE(camelCaseString: string): string {
    return camelCaseString 
        // Add an underscore before all capital letters 
        // (other than one occuring as the first character)
        // note: this only works with ASCII capital letter. Capital 
        //       letters with accents or in other scripts won't work.
        .replace(
            /(?<!^)[A-Z]/g,
            (letter) => `_${letter.toUpperCase()}`
        )
        // Then, turn all remaining letters to uppercase.
        .toUpperCase()
}

// Type definition for a performance evaluation track.
export class PerformanceEvaluationTrack<EvaluationType extends object> {
    public creationDate: Date;
    public frameTimes: number[];
    public recordTimesMs: number[];
    public user2dPoses: Pose2DPixelLandmarks[];
    public user3dPoses: Pose3DLandmarkFrame[];
    public evaluation: ArrayVersions<EvaluationType>;

    constructor(public id: string, frameTime: number, user2dPose: Pose2DPixelLandmarks, user3dPose: Pose3DLandmarkFrame, evaluationResult: EvaluationType) {
        this.creationDate = new Date();
        this.frameTimes = [frameTime];
        this.recordTimesMs = [new Date().getTime()];
        this.user2dPoses = [user2dPose];
        this.user3dPoses = [user3dPose];

        const evaluationkeys = Object.keys(evaluationResult) as Array<keyof EvaluationType>
        
        this.evaluation = evaluationkeys.reduce((acc, key) => {
            acc[key] = [evaluationResult[key]]
            return acc
        }, {} as ArrayVersions<EvaluationType>)
    }

    recordEvaluationFrame(frameTime: number, user2dPose: Pose2DPixelLandmarks, user3dPose: Pose3DLandmarkFrame, evaluationResult: EvaluationType) {
        const evaluationkeys = Object.keys(evaluationResult) as Array<keyof EvaluationType>

        const lastFrameTime = this.frameTimes.slice(-1)[0] ?? -Infinity
        if (frameTime < lastFrameTime) {
            throw new Error("Frame time must be increasing")
        }

        this.frameTimes.push(frameTime)
        this.recordTimesMs.push(new Date().getTime());
        this.user2dPoses.push(user2dPose)
        this.user3dPoses.push(user3dPose)

        for(const key of evaluationkeys) {
            this.evaluation[key].push(evaluationResult[key])
        }
    }

    getUserPose2DCsv(): string {
        
        const pose2dHeaderCols = ['frameTime', 
            ... PoseLandmarkKeys.flatMap((key, i) => {
                const landmarkName = camelCaseToCAPITALIZED_SNAKE_CASE(key)
                return [
                    `${landmarkName}_x`,
                    `${landmarkName}_y`,
                    `${landmarkName}_dist_from_camera`,
                ]
            })
        ]
        
        return Papa.unparse([
            pose2dHeaderCols, 
            ...this.user2dPoses.map(
                (pose, frame_i) => 
                [   
                    this.frameTimes[frame_i],
                    ...pose.flatMap((lm) => [
                        [lm.x], [lm.y], [lm.dist_from_camera]
                    ])
                ]
            )
        ])
    }

    getUserPose3DCsv(): string {
        const pose3dHeaderCols = ['frameTime', 
            ... PoseLandmarkKeys.flatMap((key) => {
                const landmarkName = camelCaseToCAPITALIZED_SNAKE_CASE(key)
                return [
                    `${landmarkName}_x`,
                    `${landmarkName}_y`,
                    `${landmarkName}_z`,
                ]
            })
        ]
        
        return Papa.unparse([
            pose3dHeaderCols, 
            ...this.user3dPoses.map(
                (pose, frame_i) => 
                [   
                    this.frameTimes[frame_i],
                    ...pose.flatMap((lm) => [
                        [lm.x], [lm.y], [lm.z]
                    ])
                ]
            )
        ])
    }
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
     * @param user2dPose - User's pose at the given frame time
     * @param evaluationResult - Result of the evaluation for this frame
     */
    recordEvaluationFrame(id: string, frameTime: number, user2dPose: Pose2DPixelLandmarks, user3dPose: Pose3DLandmarkFrame, evaluationResult: EvaluationType) {
        let track = this.tracks.get(id);
        if (!track) {
            track = new PerformanceEvaluationTrack(id, frameTime, user2dPose, user3dPose, evaluationResult);
            this.tracks.set(id, track);
        }
        track.recordEvaluationFrame(frameTime, user2dPose, user3dPose, evaluationResult);
    }

    /**
     * Retrieves user poses for a specified time range relative to the current frame time.
     * @param id - Identifier of the current attempt (track)
     * @param currentFrameTime - Current frame time in seconds
     * @param frameOffsets - Array of frame offsets from the current frame time
     * @returns User poses for the specified time range
     */
     getUserPosesForTimeRange(
        id: string,
        currentFrameTime: number,
        frameOffsets: number[]
    ): Pose2DPixelLandmarks[] {
        const track = this.tracks.get(id);

        if (!track) {
            throw new Error(`Track with ID ${id} does not exist.`);
        }

        const frameCount = track.frameTimes.length;
        const userPosesTrack = track.user2dPoses;

        // Calculate frame times for the specified frame offsets relative to the current frame time.
        const targetFrameTimes = frameOffsets.map(offset => currentFrameTime - offset);

        // Find the closest frame time in the track for each target frame time.
        const closestFrameIndices = targetFrameTimes.map(targetTime => {
            let closestIndex = 0;
            let closestDiff = Math.abs(targetTime - track.frameTimes[0]);

            for (let i = 1; i < frameCount; i++) {
                const diff = Math.abs(targetTime - track.frameTimes[i]);
                if (diff < closestDiff) {
                    closestIndex = i;
                    closestDiff = diff;
                }
            }

            return closestIndex;
        });

        // Retrieve user poses for the closest frames.
        const userPosesForTimeRange = closestFrameIndices.map(index => userPosesTrack[index]);

        return userPosesForTimeRange;
    }
}

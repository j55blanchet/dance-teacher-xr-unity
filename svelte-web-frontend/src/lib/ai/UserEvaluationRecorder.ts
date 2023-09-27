import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";

/**
 * For some object T, this type retains the same keys
 * but replaces each value with an array containing the same type.
 */
type ArrayVersions<T> = {
    [K in keyof T]: T[K][];
}

// Type definition for a performance evaluation track.
export class PerformanceEvaluationTrack<T extends object> {
    public creationDate: Date;
    public videoFrameTimesInSecs: number[] = [];
    public actualTimesInMs: number[] = [];
    public user2dPoses: Pose2DPixelLandmarks[] = [];
    public user3dPoses: Pose3DLandmarkFrame[] = [];
    public ref2dPoses: Pose2DPixelLandmarks[] = [];
    public ref3dPoses: Pose3DLandmarkFrame[] = [];
    public timeSeriesResults: ArrayVersions<T> | undefined;

    constructor(public id: string, public danceRelativeStem: string, public segmentDescription: string) {
        this.creationDate = new Date();
    }

    recordEvaluationFrame(
        videoTimeSecs: number, 
        actualTimeMs: number, 
        user2dPose: Pose2DPixelLandmarks, 
        user3dPose: Pose3DLandmarkFrame, 
        ref2dPose: Pose2DPixelLandmarks,
        ref3dPose: Pose3DLandmarkFrame,
        timeSeriesEvaluationMetrics: T) {

        const evaluationKeys = Object.keys(timeSeriesEvaluationMetrics) as Array<keyof T>;

        const lastFrameTime = this.videoFrameTimesInSecs.slice(-1)[0] ?? -Infinity
        if (videoTimeSecs < lastFrameTime) {
            throw new Error("Frame time must be increasing")
        }

        this.videoFrameTimesInSecs.push(videoTimeSecs)
        this.actualTimesInMs.push(actualTimeMs);
        this.user2dPoses.push(user2dPose)
        this.user3dPoses.push(user3dPose)
        this.ref2dPoses.push(ref2dPose)
        this.ref3dPoses.push(ref3dPose)
        
        if (!this.timeSeriesResults) {
            this.timeSeriesResults = {} as ArrayVersions<T>
            for(const key of evaluationKeys) {
                this.timeSeriesResults[key] = []
            }
        }

        for(const key of evaluationKeys) {
            this.timeSeriesResults[key].push(timeSeriesEvaluationMetrics[key])
        }
    }

    asDictWithoutTimeSeriesResults(): Record<string, unknown> {
        return {
            id: this.id,
            danceRelativeStem: this.danceRelativeStem,
            segmentDescription: this.segmentDescription,
            creationDate: this.creationDate,
            videoFrameTimesInSecs: this.videoFrameTimesInSecs,
            actualTimesInMs: this.actualTimesInMs,
            user2dPoses: this.user2dPoses,
            user3dPoses: this.user3dPoses,
            ref2dPoses: this.ref2dPoses,
            ref3dPoses: this.ref3dPoses,
        }
    }
}

/**
 * Class for recording user performance evaluations.
 * @template EvaluationType - The type of evaluation data to be recorded.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class UserEvaluationRecorder<EvaluationType extends Record<string, any>> {

    public tracks: Map<string, PerformanceEvaluationTrack<EvaluationType>> = new Map();

    startNewTrack(id: string, danceRelativeStem: string, segmentDescription: string) {
        if (this.tracks.has(id)) {
            throw new Error(`Track with ID ${id} already exists.`)
        }

        const newTrack = new PerformanceEvaluationTrack<EvaluationType>(id, danceRelativeStem, segmentDescription);
        this.tracks.set(id, newTrack);
    }

    /**
     * Records a frame of user performance evaluation.
     * @param id - Identifier of the current attempt, used to separate recordings into tracks
     * @param frameTime - Frame time in seconds
     * @param user2dPose - User's pose at the given frame time
     * @param evaluationResult - Result of the evaluation for this frame
     */
    recordEvaluationFrame(id: string, 
        videoTimeSecs: number, 
        actualTimeMs: number, 
        user2dPose: Pose2DPixelLandmarks, 
        user3dPose: Pose3DLandmarkFrame, 
        ref3dPose: Pose3DLandmarkFrame,
        ref2dPose: Pose2DPixelLandmarks,
        evaluationResult: EvaluationType
    ) {        
        const track = this.tracks.get(id);
        if (!track) {
            throw new Error(`Track with ID ${id} does not exist.`)
        }

        track.recordEvaluationFrame(
            videoTimeSecs, 
            actualTimeMs, 
            user2dPose, 
            user3dPose, 
            ref2dPose,
            ref3dPose,
            evaluationResult
        );
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

        const frameCount = track.videoFrameTimesInSecs.length;
        const userPosesTrack = track.user2dPoses;

        // Calculate frame times for the specified frame offsets relative to the current frame time.
        const targetFrameTimes = frameOffsets.map(offset => currentFrameTime - offset);

        // Find the closest frame time in the track for each target frame time.
        const closestFrameIndices = targetFrameTimes.map(targetTime => {
            let closestIndex = 0;
            let closestDiff = Math.abs(targetTime - track.videoFrameTimesInSecs[0]);

            for (let i = 1; i < frameCount; i++) {
                const diff = Math.abs(targetTime - track.videoFrameTimesInSecs[i]);
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

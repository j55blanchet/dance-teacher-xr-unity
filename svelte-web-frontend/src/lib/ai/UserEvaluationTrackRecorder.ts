import type { Pose2DPixelLandmarks, Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";

/**
 * For some object T, this type retains the same keys
 * but replaces each value with an array containing the same type.
 */
type ArrayVersions<T> = {
    [K in keyof T]: T[K][];
}

// Type definition for a performance evaluation track.
export class PerformanceEvaluationTrack<T extends Record<string, unknown>> {
    
    constructor(
        public id: string, 
        public danceRelativeStem: string, 
        public segmentDescription: string,
        public creationDate = new Date(),
        public videoFrameTimesInSecs: number[] = [],
        public actualTimesInMs: number[] = [],
        public user2dPoses: Pose2DPixelLandmarks[] = [],
        public user3dPoses: Pose3DLandmarkFrame[] = [],
        public ref2dPoses: Pose2DPixelLandmarks[] = [],
        public ref3dPoses: Pose3DLandmarkFrame[] = [],
        public timeSeriesResults: ArrayVersions<T> | undefined = undefined,
    ) {  
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
        const existingCurrentFrames = this.videoFrameTimesInSecs.length;
        const lastFrameTime = this.videoFrameTimesInSecs.slice(-1)[0] ?? -Infinity
        if (videoTimeSecs < lastFrameTime) {
            throw new Error(`Frame time must be increasing. Id: ${this.id}, frame time: ${videoTimeSecs}, last frame time: ${lastFrameTime}, frameCount: ${existingCurrentFrames}`);
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

    getSubTrack(videoStartTime: number, videoEndTime: number): PerformanceEvaluationTrack<T> | null {
        const frameStart = this.videoFrameTimesInSecs.findIndex(frameTime => frameTime >= videoStartTime)
        
        let frameEnd = this.videoFrameTimesInSecs.findIndex(frameTime => frameTime >= videoEndTime)
        if (frameEnd === -1) {
            frameEnd = this.videoFrameTimesInSecs.length;
        }

        if (frameStart === -1 || frameEnd === -1) {
            return null
        }
        if (frameEnd <= frameStart) {
            return null
        }

        let timeSeriesResults = undefined as typeof this.timeSeriesResults;
        
        if (this.timeSeriesResults) {
            timeSeriesResults = Object.entries(this.timeSeriesResults).reduce((acc, [key, value]) => {
                (acc as any)[key] = value.slice(frameStart, frameEnd)
                return acc
            }, {} as ArrayVersions<T>)
        }

        return new PerformanceEvaluationTrack(
            this.id,
            this.danceRelativeStem,
            this.segmentDescription,
            this.creationDate,
            this.videoFrameTimesInSecs.slice(frameStart, frameEnd),
            this.actualTimesInMs.slice(frameStart, frameEnd),
            this.user2dPoses.slice(frameStart, frameEnd),
            this.user3dPoses.slice(frameStart, frameEnd),
            this.ref2dPoses.slice(frameStart, frameEnd),
            this.ref3dPoses.slice(frameStart, frameEnd),
            timeSeriesResults,
        )
    }
}

/**
 * Class for recording user performance evaluations.
 * @template LiveMetricResultsType - The type of evaluation data to be recorded.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class UserEvaluationTrackRecorder<LiveMetricResultsType extends Record<string, any>> {

    public tracks: Map<string, PerformanceEvaluationTrack<LiveMetricResultsType>> = new Map();

    startNewTrack(id: string, danceRelativeStem: string, segmentDescription: string) {
        if (this.tracks.has(id)) {
            throw new Error(`Track with ID ${id} already exists.`)
        }

        const newTrack = new PerformanceEvaluationTrack<LiveMetricResultsType>(id, danceRelativeStem, segmentDescription);
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
        timeSeriesMetrics: LiveMetricResultsType
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
            timeSeriesMetrics
        );
    }
}

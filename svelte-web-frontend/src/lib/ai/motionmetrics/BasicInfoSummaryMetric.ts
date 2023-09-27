import type { SummaryMetric, TrackHistory } from "./MotionMetric";


type BasicInfoSummaryOutput = {
    poseFrames: number;
    realTimeDurationSecs: number;
    realTimeFps: number;
    videoTimeDurationSecs: number;
    videoTimeFps: number;
}
export class BasicInfoSummaryMetric implements SummaryMetric<BasicInfoSummaryOutput> {

    computeSummaryMetric(history: TrackHistory): BasicInfoSummaryOutput {

        const realtimeStartMs = history.actualTimesInMs[0] ?? 0;
        const realtimeEndMs = history.actualTimesInMs[history.actualTimesInMs.length - 1] ?? 0;
        const realTimeDurationSecs = (realtimeEndMs - realtimeStartMs) / 1000;
        const danceStartSecs = history.videoFrameTimesInSecs[0] ?? 0;
        const danceEndSecs = history.videoFrameTimesInSecs[history.videoFrameTimesInSecs.length - 1] ?? 0;
        const videoTimeDurationSecs = danceEndSecs - danceStartSecs;

        return {
            poseFrames: history.videoFrameTimesInSecs.length,
            realTimeDurationSecs,
            realTimeFps: history.videoFrameTimesInSecs.length / realTimeDurationSecs,
            videoTimeDurationSecs,
            videoTimeFps: history.videoFrameTimesInSecs.length / videoTimeDurationSecs,
        }
    }
    
    formatSummary(summary: BasicInfoSummaryOutput): Record<string, string | number> {
        return summary; // no formatting needed
    }

}
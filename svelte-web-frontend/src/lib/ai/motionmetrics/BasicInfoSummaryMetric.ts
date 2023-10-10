import type { SummaryMetric, TrackHistory } from "./MotionMetric";


type BasicInfoSummaryOutput = {
    poseFrameCount: number;
    realTimeDurationSecs: number;
    realTimeFps: number;
    videoTimeDurationSecs: number;
    videoTimeFps: number;
}
export default class BasicInfoSummaryMetric implements SummaryMetric<BasicInfoSummaryOutput, BasicInfoSummaryOutput> {

    summarizeMetric(history: TrackHistory): BasicInfoSummaryOutput {

        const poseFrameCount = history.videoFrameTimesInSecs.length;
        const realtimeStartMs = history.actualTimesInMs[0] ?? 0;
        const realtimeEndMs = history.actualTimesInMs[history.actualTimesInMs.length - 1] ?? 0;
        const realTimeDurationSecs = (realtimeEndMs - realtimeStartMs) / 1000;
        const danceStartSecs = history.videoFrameTimesInSecs[0] ?? 0;
        const danceEndSecs = history.videoFrameTimesInSecs[history.videoFrameTimesInSecs.length - 1] ?? 0;
        const videoTimeDurationSecs = danceEndSecs - danceStartSecs;

        return {
            poseFrameCount,
            realTimeDurationSecs,
            realTimeFps: poseFrameCount / realTimeDurationSecs,
            videoTimeDurationSecs,
            videoTimeFps: poseFrameCount / videoTimeDurationSecs,
        }
    }
    
    formatSummary(summary: BasicInfoSummaryOutput) {
        return summary; // no formatting needed
    }

}
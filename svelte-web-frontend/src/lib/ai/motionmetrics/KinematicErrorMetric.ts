// const { matchingUserPoses, uniqueFrameTimes } = removeDuplicateFrameTimes(track.userPoses, track.frameTimes);
// const [jerksMAE, jerksRSME, accsMAE, accsRSME, velsMAE, velsRSME] = calculateMotionDescriptorsScore(matchingUserPoses, this.reference2DData.get2DLandmarks(uniqueFrameTimes), uniqueFrameTimes);

import type { SummaryMetric, TrackHistory } from "./MotionMetric";
import { calculateKinematicErrorDescriptors } from "./compute-kinematic-motion-descriptors.ts";

type KinematicErrorMetricOutput = {
    jerksMAE: number | null; 
    jerksRSME: number | null; 
    accsMAE: number | null; 
    accsRSME: number | null; 
    velsMAE: number | null; 
    velsRSME: number | null;
};

export default class KinematicErrorMetric implements SummaryMetric<KinematicErrorMetricOutput, KinematicErrorMetricOutput> {

    summarizeMetric(history: TrackHistory): KinematicErrorMetricOutput {
        return calculateKinematicErrorDescriptors(
            history.user2DFrameHistory,
            history.ref2DFrameHistory,
            history.videoFrameTimesInSecs
        )
    }

    formatSummary(summary: Readonly<KinematicErrorMetricOutput>) {
        return summary; // no formatting needed, already in a row-compatible format
    }
}

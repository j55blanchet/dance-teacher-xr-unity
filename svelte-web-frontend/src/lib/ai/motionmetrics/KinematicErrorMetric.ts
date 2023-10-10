import type { SummaryMetric, TrackHistory } from "./MotionMetric";
import { calculate3DKinematicErrorDescriptors } from "./compute-kinematic-motion-descriptors-3D";
import { calculateKinematicErrorDescriptors } from "./compute-kinematic-motion-descriptors";

type KinematicErrorMetricOutput = {
    jerksMAE: number | null; 
    jerksRSME: number | null; 
    accsMAE: number | null; 
    accsRSME: number | null; 
    velsMAE: number | null; 
    velsRSME: number | null;
};

export default class KinematicErrorMetric implements SummaryMetric<KinematicErrorMetricOutput> {

    summarizeMetric(history: TrackHistory): KinematicErrorMetricOutput {
        const summary3D = calculate3DKinematicErrorDescriptors(
            history.user3DFrameHistory,
            history.ref3DFrameHistory,
            history.videoFrameTimesInSecs
        );
        const summary2D = calculateKinematicErrorDescriptors(
            history.user2DFrameHistory,
            history.ref2DFrameHistory,
            history.videoFrameTimesInSecs
        );

        // Combine the 2D and 3D summaries into a single summary object
        const combinedSummary: KinematicErrorMetricOutput = {
            ...summary2D,
            ...summary3D,
        };

        return combinedSummary;
    }

    formatSummary(summary: Readonly<KinematicErrorMetricOutput>): Record<string, string | number | null> {
        return summary; // no formatting needed, already in a row-compatible format
    }
}





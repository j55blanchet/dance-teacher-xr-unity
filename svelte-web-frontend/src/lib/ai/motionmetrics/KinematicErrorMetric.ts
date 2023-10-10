import type { SummaryMetric, TrackHistory } from "./MotionMetric";
import { calculate3DKinematicErrorDescriptors } from "./compute-kinematic-motion-descriptors-3D";
import { calculateKinematicErrorDescriptors } from "./compute-kinematic-motion-descriptors";


function prependObjectKeys<T extends Record<string, any>, prefixT extends string>(obj: T, prefix: prefixT): { [K in keyof T as `${prefixT}${Extract<K, string>}`]: T[K]}  {
   return Object.keys(obj).reduce(
    (newObjSoFar, key) => ({
      ...newObjSoFar,
        [prefix + key]: obj[key],
    }),
    {}
  ) as { 
    [K in keyof T as `${prefixT}${Extract<K, string>}`]: T[K]
  };
}

type KinematicErrorMetricOutputForSomeDimension = {
    jerksMAE: number | null; 
    jerksRSME: number | null; 
    accsMAE: number | null; 
    accsRSME: number | null; 
    velsMAE: number | null; 
    velsRSME: number | null;
};

type KinematicErrorMetricOutput = {
    summary2D: KinematicErrorMetricOutputForSomeDimension,
    summary3D: KinematicErrorMetricOutputForSomeDimension,
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
            summary2D,
            summary3D,
        };

        return combinedSummary;
    }

    formatSummary(summary: Readonly<KinematicErrorMetricOutput>) {
        
        return {
            ...prependObjectKeys(summary.summary2D, 'd2_'),
            ...prependObjectKeys(summary.summary3D, 'd3_'),
        }        
    }
}





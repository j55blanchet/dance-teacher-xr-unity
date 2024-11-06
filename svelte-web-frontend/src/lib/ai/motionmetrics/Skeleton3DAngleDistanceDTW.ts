import type { ValueOf } from "$lib/data/dances-store";
import type { Pose3DLandmarkFrame, Pose2DPixelLandmarks } from "$lib/webcam/mediapipe-utils";
import { BodyInnerAnglesComparisons, getInnerAngleFromFrame, GetHarmonicMean, getArraySD } from "../EvaluationCommonUtils";
import type { LiveEvaluationMetric, SummaryMetric, TrackHistory } from "./MotionMetric";

import { DynamicTimeWarping } from "./DynamicTimeWarping";
import { computeSkeleton3DVectorAngleSimilarity } from "./Skeleton3dVectorAngleSimilarityMetric";

import * as dfd from "danfojs/dist/danfojs-browser/src"

type AngleComparisonKey = keyof typeof BodyInnerAnglesComparisons;
type AngleComparisonValue = ValueOf<typeof BodyInnerAnglesComparisons>;

type Angle3D_DtwMetricSummaryOutput = ReturnType<Skeleton3DAngleDistanceDTW["summarizeMetric"]>; 

type Angle3D_DtwMetricSummaryFormattedOutput = ReturnType<Skeleton3DAngleDistanceDTW["formatSummary"]>;

export default class Skeleton3DAngleDistanceDTW implements SummaryMetric<Angle3D_DtwMetricSummaryOutput, Angle3D_DtwMetricSummaryFormattedOutput> {
    

    summarizeMetric(_history: TrackHistory) {
        
        const dtw = new DynamicTimeWarping<Pose3DLandmarkFrame, Pose3DLandmarkFrame>(
            _history.ref3DFrameHistory, _history.user3DFrameHistory, 
            (a, b) => {
                return 1 - computeSkeleton3DVectorAngleSimilarity(a, b).overallScore;
            }
        );

        const distance = dtw.getDistance();
        const path = dtw.getPath();

        const pathDf = new dfd.DataFrame(path);
        
        // quantify degree of warping
        const pathLength = path.length;
        const refLength = _history.ref3DFrameHistory.length;
        const userLength = _history.user3DFrameHistory.length;
        const warpingFactor = (pathLength - Math.min(refLength, userLength)) / Math.max(refLength, userLength);


        return {
            dtwDistance: distance,
            dtwPath: pathDf,
            warpingFactor: warpingFactor
        }
    }

    formatSummary(summary: Angle3D_DtwMetricSummaryOutput) {


        const dtwPathJson = dfd.toJSON(summary.dtwPath, { format: "row" });
        return {
            "DTW Distance": summary.dtwDistance,
            "DTW Path": JSON.stringify(dtwPathJson),
            "Warping Factor": summary.warpingFactor
        } as const;
    }

    plotSummary(elementID: string, summary: { dtwDistance: number; dtwPath: dfd.DataFrame; warpingFactor: number; }): void {
        
        summary.dtwPath.plot(elementID);
        // throw new Error("Method not implemented.");
    }
}
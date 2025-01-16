import type { ValueOf } from "$lib/data/dances-store";
import type { Pose3DLandmarkFrame, Pose2DPixelLandmarks } from "$lib/webcam/mediapipe-utils";
import { BodyInnerAnglesComparisons, getInnerAngleFromFrame, GetHarmonicMean, getArraySD } from "../EvaluationCommonUtils";
import type { LiveEvaluationMetric, SummaryMetric, TrackHistory } from "./MotionMetric";

import { DynamicTimeWarping } from "./DynamicTimeWarping";
import { computeSkeleton3DVectorAngleSimilarity } from "./Skeleton3dVectorAngleSimilarityMetric";
import type { Data } from "plotly.js-dist-min";

let Plotly: typeof import("plotly.js-dist-min");

type AngleComparisonKey = keyof typeof BodyInnerAnglesComparisons;
type AngleComparisonValue = ValueOf<typeof BodyInnerAnglesComparisons>;

type Angle3D_DtwMetricSummaryOutput = ReturnType<Skeleton3DAngleDistanceDTW["summarizeMetric"]>; 

type Angle3D_DtwMetricSummaryFormattedOutput = ReturnType<Skeleton3DAngleDistanceDTW["formatSummary"]>;

export default class Skeleton3DAngleDistanceDTW implements SummaryMetric<Angle3D_DtwMetricSummaryOutput, Angle3D_DtwMetricSummaryFormattedOutput> {
    

    summarizeMetric(_history: TrackHistory) {
        
        const dtw = new DynamicTimeWarping<Pose3DLandmarkFrame, Pose3DLandmarkFrame>(
            _history.user3DFrameHistory, _history.ref3DFrameHistory,
            (a, b) => {
                return 1 - computeSkeleton3DVectorAngleSimilarity(a, b).overallScore;
            }
        );
        const createDtwForJoint = (key: keyof typeof BodyInnerAnglesComparisons) => {
            return new DynamicTimeWarping<Pose3DLandmarkFrame, Pose3DLandmarkFrame>(
                _history.user3DFrameHistory, _history.ref3DFrameHistory,
                (a, b) => {
                    return computeSkeleton3DVectorAngleSimilarity(a, b).individualScores[key].diffDegrees;
                }
            );
        };

        const dtw_by_joint = Object.keys(BodyInnerAnglesComparisons).map((key) => {
            return createDtwForJoint(key as keyof typeof BodyInnerAnglesComparisons);
        });
        
        const distance = dtw.getDistance();
        const path = dtw.getPath();

        // pathDf.setIndex({ column: "reference"});

        
        // quantify degree of warping
        const pathLength = path.length;
        const refLength = _history.ref3DFrameHistory.length;
        const userLength = _history.user3DFrameHistory.length;
        const warpingFactor = (pathLength - Math.min(refLength, userLength)) / Math.max(refLength, userLength);

        // let jointByJointPaths = dtw_by_joint.map((dtw) => {
        //     return new dfd.DataFrame(dtw.getPath(), {
        //         columns: ["user", "reference"],
        //     });
        // })
        // jointByJointPaths = jointByJointPaths.reduce((acc, df) => {
            // return acc.addColumn(df);
        // });

        // const jointByJointPaths = Object.keys(BodyInnerAnglesComparisons).map((key, i) => {
        //     const path = dtw_by_joint[i].getPath();
        //     return new dfd.DataFrame(path, {
        //         columns: ["user", "reference"],
        //     });
        // })
        // const jointByJointPathsDf = jointByJointPaths.reduce((acc, df) => {
        //     return acc.addColumn(df);
        // }, new dfd.DataFrame({}));


        return {
            dtwDistance: distance,
            dtwPath: path,
            warpingFactor: warpingFactor,
            jointByJointDistances: dtw_by_joint.map((dtw) => {
                return {
                    distance: dtw.getDistance(),
                }
            }),
            jointByJointPaths: dtw_by_joint.map((dtw) => {
                return dtw.getPath();
            })
        }
    }

    formatSummary(summary: Angle3D_DtwMetricSummaryOutput) {


        // const dtwPathJson = dfd.toJSON(summary.dtwPath, { format: "row" });
        return {
            "DTW Distance": summary.dtwDistance,
            "DTW Path": JSON.stringify(summary.dtwPath),
            "Warping Factor": summary.warpingFactor
        } as const;
    }

    async plotSummary(element: HTMLElement, summary: Angle3D_DtwMetricSummaryOutput) {
        
        if (!Plotly) {
            Plotly = await import("plotly.js-dist-min");
        }

        if (!element) throw new Error("Element with the specified ID not found")

        const mainDiv = document.createElement("div");
        element.appendChild(mainDiv);
    
        const maxDtwValue = Math.max(...summary.dtwPath.map((point) => point[1]));

        Plotly.newPlot(
            mainDiv, 
            [{
                x: summary.dtwPath.map((point) => point[0]),
                y: summary.dtwPath.map((point) => point[1]),
                mode: 'lines+markers',
                type: 'scatter',
                name: 'DTW Path',
                xaxis: 'reference',
                yaxis: 'user',
            },
            {
                // add a reference diagonal line
                x: [0, maxDtwValue],
                y: [0, maxDtwValue],
                mode: 'lines',
                type: 'scatter',
                name: 'Reference Diagonal',
                // make the line dashed and semi-transparent
                line: {
                    dash: 'dash',
                    color: 'rgba(0, 0, 0, 0.5)',
                },
            }
        ],
            {
                xaxis: {
                    title: 'Reference Frame',
                    domain: [0, 0.85],
                },
                yaxis: {
                    title: 'User Frame',
                    domain: [0, 1],
                },
                title: "DTW Path",
                showlegend: false,
            }, // layout
            { // config
                staticPlot: true, 
                responsive: true,
            }
        );
        
        const jointByJointDiv = document.createElement("div");
        element.appendChild(jointByJointDiv);

        const jointByJointData: Data[] = summary.jointByJointPaths.map((path, i) => {
            return {
                x: path.map((point) => point[0]),
                y: path.map((point) => point[1]),
                mode: 'lines+markers',
                type: 'scatter',
                name: `${Object.keys(BodyInnerAnglesComparisons)[i]} (cost=${summary.jointByJointDistances[i].distance.toFixed(2)})`,
                xaxis: 'reference',
                yaxis: 'user',
            }
        });

        // add reference line
        jointByJointData.push({
            x: [0, maxDtwValue],
            y: [0, maxDtwValue],
            mode: 'lines',
            type: 'scatter',
            name: 'Reference Diagonal',
            line: {
                dash: 'dash',
                color: 'rgba(0, 0, 0, 0.5)',
            },
            showlegend: false,
        });

        Plotly.newPlot(
            jointByJointDiv, 
            jointByJointData,
            {
                xaxis: {
                    title: 'Reference Frame',
                    domain: [0, 0.85],
                },
                yaxis: {
                    title: 'User Frame',
                    domain: [0, 1],
                },
                title: "DTW Path by Joint",
                showlegend: true,
                legend: {
                    x: 0.5,
                    y: -0.10
                  }
            }, // layout
            { // config
                staticPlot: true, 
                responsive: true,
            }
        );
           
    }
}
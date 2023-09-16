import { DrawingUtils, type NormalizedLandmark, type LandmarkData } from "@mediapipe/tasks-vision";
import { QijiaMethodComparisonVectors, type EvaluationV1Result } from "./evaluation";
import { SwapLeftRightLandmarks } from "$lib/webcam/mediapipe-utils";

import {feedback_YellowThreshold, feedback_GreenThreshold} from '$lib/model/settings';

const QijiaMethodVectorConnections = QijiaMethodComparisonVectors.map(([lm1, lm2]) => {
    return {
        start: lm1,
        end: lm2,
    }
});

// function getComparisonVectorIndex(lmData: LandmarkData) {
//     for(const [i, [lm1, lm2]] of QijiaMethodComparisonVectors.entries()) {
//         if ((lm1 === lmData.from || lm1 === lmData.to) && (

//         )) {
//             return i;
//         }
//     }
//     return null
// }

let greenThreshold = 0;
feedback_GreenThreshold.subscribe((val) => {
    greenThreshold = val;
});
let yellowThreshold = 0;
feedback_YellowThreshold.subscribe((val) => {
    yellowThreshold = val;
});

function getVectorColor(lmData: LandmarkData, evaluationResult: EvaluationV1Result | null) {
    const score = evaluationResult?.qijiaByVectorScores[lmData.index ?? -1];
    if (score === undefined) return 'white';
    
    if (score >= greenThreshold) return 'green';
    if (score >= yellowThreshold) return 'yellow';
    return 'red';
}

export function DrawColorCodedSkeleton(
    ctx: CanvasRenderingContext2D, 
    pose: null | NormalizedLandmark[], 
    evaluationResult: EvaluationV1Result | null,
    flipLeftRight = false) 
{
    if (!pose) return;

    if (flipLeftRight) {
        pose = SwapLeftRightLandmarks(pose);
    }
    
    // We'll color code only the vectors with the lowest score
    const drawUtils = new DrawingUtils(ctx);
    drawUtils.drawConnectors(
        pose, 
        QijiaMethodVectorConnections,
        { 
            color: (lm) => getVectorColor(lm, evaluationResult), 
            lineWidth: 4,
        }
    );
}
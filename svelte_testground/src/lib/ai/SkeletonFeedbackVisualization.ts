import { DrawingUtils, type NormalizedLandmark, type LandmarkData } from "@mediapipe/tasks-vision";
import { QijiaMethodComparisonVectors, type EvaluationV1Result } from "./Evaluation";


const GREEN_MINSCORE = 4.5;
const YELLOW_MINSCORE = 3.5;

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

function getVectorColor(lmData: LandmarkData, evaluationResult: EvaluationV1Result | null) {
    const score = evaluationResult?.qijiaByVectorScores[lmData.index ?? -1];
    if (score === undefined) return 'white';
    
    if (score >= GREEN_MINSCORE) return 'green';
    if (score >= YELLOW_MINSCORE) return 'yellow';
    return 'red';
}

export function DrawColorCodedSkeleton(ctx: CanvasRenderingContext2D, pose: null | NormalizedLandmark[], evaluationResult: EvaluationV1Result | null) {
    if (!pose) return;
    
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
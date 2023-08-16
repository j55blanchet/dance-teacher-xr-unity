import type { Pose2DReferenceData } from "$lib/dances-store";
import type { TerminalFeedback, TerminalFeedbackAction, TerminalFeedbackBodyPart } from "$lib/model/TerminalFeedback";
import { type Pose2DPixelLandmarks, PoseLandmarkIds, PoseLandmarkKeys } from "$lib/webcam/mediapipe-utils";
import { getRandomBadTrialHeadline, getRandomGoodTrialHeadline } from "./Feedback";

export const QijiaMethodComparisonVectors = Object.freeze([
    [PoseLandmarkIds.leftShoulder,  PoseLandmarkIds.rightShoulder],
    [PoseLandmarkIds.leftShoulder,  PoseLandmarkIds.leftHip],
    [PoseLandmarkIds.leftHip,       PoseLandmarkIds.rightHip],
    [PoseLandmarkIds.rightHip,      PoseLandmarkIds.rightShoulder],
    [PoseLandmarkIds.leftShoulder,  PoseLandmarkIds.leftElbow],
    [PoseLandmarkIds.leftElbow,     PoseLandmarkIds.leftWrist],
    [PoseLandmarkIds.rightShoulder, PoseLandmarkIds.rightElbow],
    [PoseLandmarkIds.rightElbow,    PoseLandmarkIds.rightWrist]
])

const ComparisonVectorToTerminalFeedbackBodyPartMap = new Map<number, TerminalFeedbackBodyPart>([
    [0, "torso"], // leftShoulder -> rightShoulder
    [1, "torso"], // leftShoulder -> leftHip
    [2, "torso"], // leftHip -> rightHip
    [3, "torso"], // rightHip -> rightShoulder
    [4, "leftarm"], // leftShoulder -> leftElbow
    [5, "leftarm"], // leftElbow -> leftWrist
    [6, "rightarm"], // rightShoulder -> rightElbow
    [7, "rightarm"], // rightElbow -> rightWrist
]);

export const QijiaMethodComparisionVectorNames = QijiaMethodComparisonVectors.map((vec, i) => {
    const [lmSrc, lmDest] = vec;
    const [srcName, destName] = [PoseLandmarkKeys[lmSrc], PoseLandmarkKeys[lmDest]];
    const key = `${srcName} -> ${destName}`
    return key;
});

const QijiaMethodComparisionVectorNamesToIndexMap = new Map(QijiaMethodComparisionVectorNames.map((name, i) => [name, i]))

function lerp(val: number, srcMin: number, srcMax: number, destMin: number, destMax: number) {
    const srcRange = srcMax - srcMin
    const destRange = destMax - destMin
    return destMin + (destRange * ((val - srcMin) / srcRange))
}

function getMagnitude(v: [number, number]) {
    return Math.pow(Math.pow(v[0], 2) + Math.pow(v[1], 2), 0.5)
}

function getArraySum(v: Array<number>) {
    return v.reduce((a, b) => a + b, 0)
}
function getArrayMean(v: Array<number>) {
    return getArraySum(v) / v.length
}

function GetNormalizedVector(
    pixelLandmarks: Pose2DPixelLandmarks,
    srcLandmark: number,
    destLandmark: number, 
){
    // TODO: utilize a vector arithmetic library?
    const {x: sx, y: sy } = pixelLandmarks[srcLandmark]
    const {x: dx, y: dy } = pixelLandmarks[destLandmark]
    const [vec_x, vec_y] = [dx - sx, dy - sy]
    const mag = getMagnitude([vec_x, vec_y]);
    return [vec_x / mag, vec_y / mag]
}

export function computeSkeleton2DSimilarityJulienMethod(
    refLandmarks: Pose2DPixelLandmarks,
    userLandmarks: Pose2DPixelLandmarks
) {
    const score = 0

    // Idea: 2D vector comparison should look at both angle and magnitude, since angle
    //       changes are only meaningful when a vectors is perpendicular to the camera.
    //         > When both vectors are orthogonal to the camera, the angle between them is
    //           the primary metric for similarity.
    //         > When one or both vectors are parallel to the camera, the magnitude of the
    //           vectors is the primary metric for similarity. (we don't want to compare angles in this case,
    //           because slight changes in angle can result in large changes in the normalized 2D projection 
    //           of the vector).
    //         > We can scale the relative constribution of each of these similarity metrics based on the
    //           current 2D magnitude of the vectors relative to the maximum observed length of that vector.

    // Another idea: Mediapipe includes an approximate z-value for each landmark. We can use this
    //               to simply compute angle changes in 3D space. This is a simpler approach, but
    //               should work so long as mediapipe's z-values are accurate enough.

    return score
}

type Vec8 = [number, number, number, number, number, number, number, number]
/**
 * 
 * @param refLandmarks Reference landmarks (expert)
 * @param userLandmarks Evaluation landmarks (learner)
 * @returns Tuple of scores between 0 and 5, where 0 is the worst and 5 is the best. First is a scalar with the overall score, next is a vector by vector score of the 8 comparison vectors.
 */
export function computeSkeletonDissimilarityQijiaMethod(
    refLandmarks: Pose2DPixelLandmarks, 
    userLandmarks: Pose2DPixelLandmarks
): [number, Vec8] {

    // From the paper: 
    //     At each frame, we compute the absolute difference be-
    // tween the corresponding unit vectors of the learner and the
    // expert, and then sum them up as the per-frame dancing error.
    // The overall dancing error is calculated as the average of all
    // frames of the dance. Finally, we scale the score into the range
    // of [0, 5], where 0 denotes the poorest performance and 5 rep-
    // resents the best performance. This normalized score serves
    // as the final performance rating.
    let rawOverallDisimilarityScore = 0

    // Compare 8 Vectors
    const vectorDissimilarityScores = QijiaMethodComparisonVectors.map((vecLandmarkIds) => {
        const [srcLandmark, destLandmark] = vecLandmarkIds
        const [refX, refY] = GetNormalizedVector(refLandmarks, srcLandmark, destLandmark)
        const [usrX, usrY] = GetNormalizedVector(userLandmarks, srcLandmark, destLandmark)
        const [dx, dy] = [refX - usrX, refY - usrY]
        return getMagnitude([dx, dy]) || 0;
    });


    rawOverallDisimilarityScore = getArrayMean(vectorDissimilarityScores);

    // According to Qijia, we used an upper bound of 2.0 for the dissimimlarity score (which would indicate all vectors
    // of the user faced the exact opposite directions of the expert), and the lower bound was zero (which would indicate
    // a perfect match with the expert)
    // If a user's dissimilarity score was closer to 0, they did well, and if it was closer
    // to 2.0, they did poorly. (These specific numbers are not mentioned in the paper). 
    const SRC_DISSIMILARITY_WORST = 2.0
    const SRC_DISSIMILARITY_BEST = 0.0
    
    // We want to scale the score to a [0...5] range
    const TARGET_BEST = 5.0
    const TARGET_WORST = 0.0

    function scaleScore(s: number) {
        return lerp(s, SRC_DISSIMILARITY_BEST, SRC_DISSIMILARITY_WORST, TARGET_BEST, TARGET_WORST)
    }

    const overallOutputScore = scaleScore(rawOverallDisimilarityScore)
    const vectorOutputScores = vectorDissimilarityScores.map(scaleScore) as Vec8;

    return [overallOutputScore, vectorOutputScores];
}

export type PerformanceEvaluationTrack<EvaluationType> = {
    creationDate: Date;
    frameTimes: number[];
    recordTimesMs: number[];
    userPoses: Pose2DPixelLandmarks[];
    evaluation: ArrayVersions<EvaluationType>;
}

type ArrayVersions<T> = {
    [K in keyof T]: T[K][];
}

export class UserEvaluationRecorder<EvaluationType extends Record<string, any>> {

    public tracks: Map<string, PerformanceEvaluationTrack<EvaluationType>> = new Map();

    recordEvaluationFrame(id: string, frameTime: number, userPose: Pose2DPixelLandmarks, evaluationResult: EvaluationType) {
        const evaluationkeys = Object.keys(evaluationResult) as Array<keyof EvaluationType>

        if(!this.tracks.has(id)) {
            this.tracks.set(id, {
                creationDate: new Date(),
                frameTimes: [],
                recordTimesMs: [],
                userPoses: [],
                evaluation: evaluationkeys.reduce((acc, key) => {
                    acc[key] = []
                    return acc
                }, {} as ArrayVersions<EvaluationType>)
            })
        } 

        const lastFrameTime = this.tracks.get(id)?.frameTimes.slice(-1)[0] ?? -Infinity
        if (frameTime < lastFrameTime) {
            throw new Error("Frame time must be increasing")
        }

        const track = this.tracks.get(id)!
        track.frameTimes.push(frameTime)
        track.recordTimesMs.push(new Date().getTime());
        track.userPoses.push(userPose)

        for(const key of evaluationkeys) {
            track.evaluation[key].push(evaluationResult[key])
        }
    }
}


export type EvaluationV1Result = {
    qijiaOverallScore: number;
    qijiaByVectorScores: Vec8;
    julienScore: number;
};

/**
 * Evaluates a user's dance performance against a reference dance.
 */
export class UserDanceEvaluatorV1 {

    public recorder = new UserEvaluationRecorder<EvaluationV1Result>();
    constructor(private referenceData: Pose2DReferenceData) {
    };

    /**
     * Evaluates a single frame of a user's dance performance.
     * @param trialId Identifier of the current attempt, used to separate recordings into tracks
     * @param frameTime Frame time in seconds
     * @param userPose User's pose at the given frame time
     */
    evaluateFrame(trialId: string, frameTime: number, userPose: Pose2DPixelLandmarks): EvaluationV1Result | null {

        const referencePose = this.referenceData.getReferencePoseAtTime(frameTime);
        if (!referencePose) {
            return null;
        }

        const [qijiaOverallScore, qijiaByVectorScores] = computeSkeletonDissimilarityQijiaMethod(
            referencePose, 
            userPose
        )

        const julienScore = computeSkeleton2DSimilarityJulienMethod(
            referencePose,
            userPose
        )

        const evaluationResult = { 
            qijiaOverallScore,
            qijiaByVectorScores,
            julienScore: julienScore
         }

        this.recorder.recordEvaluationFrame(
            trialId,
            frameTime,
            userPose,
            evaluationResult
        )
        return evaluationResult;
    }

    getPerformanceSummary(id: string) {

        const track = this.recorder.tracks.get(id)
        if (!track) {
            return null;
        }

        const vectorScoreKeyValues = QijiaMethodComparisonVectors.map((vec, i) => {
            const key = QijiaMethodComparisionVectorNames[i];
            const vecScores = track.evaluation.qijiaByVectorScores.map((scores) => scores[i]);
            const meanScore = getArrayMean(vecScores);
            return [key, meanScore] as [string, number];
        });

        // const evaluationKeys = Object.keys(track.evaluation) as Array<keyof EvaluationV1>
        
        const qijiaOverallScore = getArrayMean(track.evaluation.qijiaOverallScore);
        const qijiaByVectorScores = new Map(vectorScoreKeyValues)
        
        // evaluationKeys.reduce((summary, key) => {
        //     const sumOfMetric = track.evaluation[key].reduce((runningTotal, frameValue) => runningTotal + frameValue, 0)
        //     summary[key] = sumOfMetric / track.evaluation[key].length
        //     return summary
        // }, {} as Record<string, number>)
        
        
        const frameCount = track.frameTimes.length
        const realtimeDurationSecs = (track.recordTimesMs[frameCount - 1] - track.recordTimesMs[0]) / 1000
        const danceTimeDurationSecs = track.frameTimes[frameCount - 1] - track.frameTimes[0]
        const danceTimeFps = frameCount / danceTimeDurationSecs
        const realTimeFps = frameCount / realtimeDurationSecs

        return {
            frameCount,
            danceTimeDurationSecs,
            realtimeDurationSecs,
            danceTimeFps,
            realTimeFps,
            qijiaOverallScore,
            qijiaByVectorScores
        }
    }

    generateTerminalFeedback(performanceSummary: ReturnType<typeof this.getPerformanceSummary>): TerminalFeedback {
        if (!performanceSummary) {
            return {
                headline: "Try Again?",
                subHeadline: "We don't have any feedback for you.",
                suggestedAction: "repeat",
            };
        }

        const { qijiaOverallScore, qijiaByVectorScores } = performanceSummary;
        let headline: string;
        let subHeadline: string;
        let suggestedAction: TerminalFeedbackAction;
        let incorrectBodyParts: TerminalFeedbackBodyPart[] | undefined;

        const [worstComparisonVectorIndex, worstVectorScore] = [... qijiaByVectorScores.keys()].map((vectorName) => {
            const vectorIndex = QijiaMethodComparisionVectorNamesToIndexMap.get(vectorName);
            if (vectorIndex === undefined) { throw new Error("Unexpected vector name: " + vectorName); }
            const vectorScore = qijiaByVectorScores.get(vectorName);
            if (vectorScore === undefined) { throw new Error("Unable to retrieve score for " + vectorName); }

            return [vectorIndex, vectorScore] as [number, number];
        }).reduce(([worstVectorSoFar, worstScoreSoFar], [vectorIndex, vectorScore]) => {
            if (vectorScore < worstScoreSoFar) {
                return [vectorIndex, vectorScore] as [number, number];
            } else {
                return [worstVectorSoFar, worstScoreSoFar] as [number, number];
            }
        }, [-1, Infinity] as [number, number]);

        if (qijiaOverallScore > 4.0) {
            headline = getRandomGoodTrialHeadline();
            subHeadline = "You did great on that trial! Would you like to move on now?";
            suggestedAction = "next";
        } else {
            headline = getRandomBadTrialHeadline();
            subHeadline = "Want to try again?";
            suggestedAction = "repeat";

            // Call out the worst body part
            const bodyPartToCallOut = ComparisonVectorToTerminalFeedbackBodyPartMap.get(worstComparisonVectorIndex);
            if (!bodyPartToCallOut) { throw new Error("Unexpected vector index: " + worstComparisonVectorIndex); }
            incorrectBodyParts = [bodyPartToCallOut];
        }

        return {
            headline: headline,
            subHeadline: subHeadline,
            score: qijiaOverallScore,
            suggestedAction: suggestedAction,
            incorrectBodyParts
        }
    }
}


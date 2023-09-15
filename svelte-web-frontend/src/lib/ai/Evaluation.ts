import type { Pose2DReferenceData } from "$lib/dances-store";
import { TerminalFeedbackBodyParts, type TerminalFeedback, type TerminalFeedbackAction, type TerminalFeedbackBodyPart, type TerminalFeedbackBodyPartIndex } from "$lib/model/TerminalFeedback";
import { type Pose2DPixelLandmarks, PoseLandmarkIds, PoseLandmarkKeys, type PoseLandmarkIndex } from "$lib/webcam/mediapipe-utils";
import { getRandomBadTrialHeadline, getRandomGoodTrialHeadline } from "./Feedback";
import { lerp } from "$lib/utils/math";
import { evaluation_GoodBadTrialThreshold } from "$lib/model/settings";

let evaluation_GoodBadTrialThresholdValue = 1.0;
evaluation_GoodBadTrialThreshold.subscribe((value) => {
    evaluation_GoodBadTrialThresholdValue = value;
});

function GetScaleIndicator(pixelLandmarks: Pose2DPixelLandmarks){

    const leftTorsoHeight = getMagnitude(GetVector(pixelLandmarks, PoseLandmarkIds.leftShoulder, PoseLandmarkIds.leftHip))
    const rightTorsoHeight = getMagnitude(GetVector(pixelLandmarks, PoseLandmarkIds.rightShoulder, PoseLandmarkIds.rightHip))
    const shoulderWidth = getMagnitude(GetVector(pixelLandmarks, PoseLandmarkIds.leftShoulder, PoseLandmarkIds.rightShoulder))
    
    return 0.25 * leftTorsoHeight + 
           0.25 * rightTorsoHeight +
           0.5 * shoulderWidth
}

export const QijiaMethodComparisonVectors: Readonly<Array<[PoseLandmarkIndex, PoseLandmarkIndex]>> = Object.freeze([
    [PoseLandmarkIds.leftShoulder,  PoseLandmarkIds.rightShoulder],
    [PoseLandmarkIds.leftShoulder,  PoseLandmarkIds.leftHip],
    [PoseLandmarkIds.leftHip,       PoseLandmarkIds.rightHip],
    [PoseLandmarkIds.rightHip,      PoseLandmarkIds.rightShoulder],
    [PoseLandmarkIds.leftShoulder,  PoseLandmarkIds.leftElbow],
    [PoseLandmarkIds.leftElbow,     PoseLandmarkIds.leftWrist],
    [PoseLandmarkIds.rightShoulder, PoseLandmarkIds.rightElbow],
    [PoseLandmarkIds.rightElbow,    PoseLandmarkIds.rightWrist]
])

export const QijiaMethodComparisionVectorNames = QijiaMethodComparisonVectors.map((vec) => {
    const [lmSrc, lmDest] = vec;
    const [srcName, destName] = [PoseLandmarkKeys[lmSrc], PoseLandmarkKeys[lmDest]];
    const key = `${srcName} -> ${destName}`
    return key;
});

const MinVectorMagnitudeForReliableAngleDetermination = 50;
const TargetVectorMagnitudeForReliableAngleDetermination = 100;

const QijiaMethodComparisionVectorNamesToIndexMap = new Map(QijiaMethodComparisionVectorNames.map((name, i) => [name, i]))

function getMagnitude(v: [number, number]) {
    return Math.pow(Math.pow(v[0], 2) + Math.pow(v[1], 2), 0.5)
}

function getInnerAngle(v1: [number, number], v2: [number, number]) {
    return Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (getMagnitude(v1) * getMagnitude(v2)))
}

function addVectors(v1: [number, number], v2: [number, number]) {
    return [v1[0] + v2[0], v1[1] + v2[1]]
}

function getArraySum(v: Array<number>) {
    return v.reduce((a, b) => a + b, 0)
}
function getArrayMean(v: Array<number>) {
    return getArraySum(v) / v.length
}

function GetVector(    
    pixelLandmarks: Pose2DPixelLandmarks,
    srcLandmark: number,
    destLandmark: number
) {
    const {x: sx, y: sy } = pixelLandmarks[srcLandmark]
    const {x: dx, y: dy } = pixelLandmarks[destLandmark]
    return [dx - sx, dy - sy] as [number, number]
}

function GetNormalizedVector(
    pixelLandmarks: Pose2DPixelLandmarks,
    srcLandmark: number,
    destLandmark: number, 
){
    // TODO: utilize a vector arithmetic library?
    const [vec_x, vec_y] = GetVector(pixelLandmarks, srcLandmark, destLandmark)
    const mag = getMagnitude([vec_x, vec_y]);
    return [vec_x / mag, vec_y / mag]
}

export function computeSkeleton2DDissimilarityJulienMethod(
    refLandmarks: Pose2DPixelLandmarks,
    userLandmarks: Pose2DPixelLandmarks
) {

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
    const vectorScoreInfos = QijiaMethodComparisonVectors.map((vecLandmarkIds, i) => {
        const [srcLandmark, destLandmark] = vecLandmarkIds
        const [refX, refY] = GetVector(refLandmarks, srcLandmark, destLandmark)
        const [usrX, usrY] = GetVector(userLandmarks, srcLandmark, destLandmark)

        const scaleRef = GetScaleIndicator(refLandmarks)
        const scaleUsr = GetScaleIndicator(userLandmarks)

        const [magnitudeRef, magnitudeUsr] = [getMagnitude([refX, refY]), getMagnitude([usrX, usrY])]
        const adjustedMagnitudeUsr = magnitudeUsr * scaleRef / scaleUsr
        const magnitudePercentileDifferential = Math.abs(magnitudeRef - adjustedMagnitudeUsr) / Math.max(magnitudeRef, adjustedMagnitudeUsr)

        const innerAngle = getInnerAngle([refX, refY], [usrX, usrY]);
        const innerAnglePercentileDifferential = innerAngle / Math.PI

        // Idea: if either the user or the reference pose is substantially othogonal to the
        // plane of the image, we want to prioritize mangitude comparison (because slight changes in 
        // angle would result in large changes in the normalized 2D projection of the vector). So we 
        // compute a "angle weighting factor" for both the user and reference pose, and use the 
        // minimum of the two
        const percentOfMetricToComputeFromAngleBasedOnReferencePose = lerp(
            magnitudeRef, 
            MinVectorMagnitudeForReliableAngleDetermination, 
            TargetVectorMagnitudeForReliableAngleDetermination,
            0.0,
            1.0
        )
        const percentOfMetricToComputeFromAngleBasedOnUserPose = lerp(
            magnitudeUsr,
            MinVectorMagnitudeForReliableAngleDetermination,
            TargetVectorMagnitudeForReliableAngleDetermination,
            0.0,
            1.0
        )
        // Use the minimum of the two "angle weighing factors". If both are within image plane, this
        // weighting factors will be closer to 1.0, but if either is orthogonal to the image plane,
        // it will be closer to 0.0
        const percentOfMetricToComputeFromAngle = Math.min(percentOfMetricToComputeFromAngleBasedOnReferencePose, percentOfMetricToComputeFromAngleBasedOnUserPose)
        const compoundDissimilarityPercentile = percentOfMetricToComputeFromAngle * innerAnglePercentileDifferential + (1 - percentOfMetricToComputeFromAngle) * magnitudePercentileDifferential

        return {
            magnitude: magnitudePercentileDifferential, 
            angle: innerAnglePercentileDifferential,
            pAngle: percentOfMetricToComputeFromAngle,
            score: compoundDissimilarityPercentile
        };
    });

    return {
        // Score is scaled between 0 and 1 - 0 is the best and 1 is the worst.
        score: getArrayMean(vectorScoreInfos.map((s) => s.score)),
        infoByVetor: vectorScoreInfos
    };
}

type Vec8 = [number, number, number, number, number, number, number, number]
/**
 * Compute the similarity of two poses based on a 2D projection, looking at a set of 8 upper body
 * comparison vectors, as described by our JLS paper. The similarity is computed by normalizing each
 * of these comparison vectors and computing the distance between the corresponding normalized vectors,
 * (a value between good=0 and bad=2), remaiing to 0=bad, 5=good, then taking the average across the 
 * comparison vectors.
 * @param refLandmarks Reference landmarks (expert)
 * @param userLandmarks Evaluation landmarks (learner)
 * @returns Tuple of scores between 0 and 5, where 0 is the worst and 5 is the best. First is a scalar with the overall score, next is array of the scores of the 8 comparison vectors.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class UserEvaluationRecorder<EvaluationType extends Record<string, any>> {

    public tracks: Map<string, PerformanceEvaluationTrack<EvaluationType>> = new Map();

    recordEvaluationFrame(id: string, frameTime: number, userPose: Pose2DPixelLandmarks, evaluationResult: EvaluationType) {
        const evaluationkeys = Object.keys(evaluationResult) as Array<keyof EvaluationType>

        let track: PerformanceEvaluationTrack<EvaluationType>
        if(!this.tracks.has(id)) {
            track = {
                creationDate: new Date(),
                frameTimes: [],
                recordTimesMs: [],
                userPoses: [],
                evaluation: evaluationkeys.reduce((acc, key) => {
                    acc[key] = []
                    return acc
                }, {} as ArrayVersions<EvaluationType>)
            }
            this.tracks.set(id, track)
        } else {
            // We know the track exists, since we just checked it
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            track = this.tracks.get(id)!
        }

        const lastFrameTime = this.tracks.get(id)?.frameTimes.slice(-1)[0] ?? -Infinity
        if (frameTime < lastFrameTime) {
            throw new Error("Frame time must be increasing")
        }

        
        track.frameTimes.push(frameTime)
        track.recordTimesMs.push(new Date().getTime());
        track.userPoses.push(userPose)

        for(const key of evaluationkeys) {
            track.evaluation[key].push(evaluationResult[key])
        }
    }
}


export type EvaluationV1Result = NonNullable<ReturnType<UserDanceEvaluatorV1["evaluateFrame"]>>;

const ComparisonVectorToTerminalFeedbackBodyPartMap = new Map<TerminalFeedbackBodyPartIndex, TerminalFeedbackBodyPart>([
    [0, "torso"], // leftShoulder -> rightShoulder
    [1, "torso"], // leftShoulder -> leftHip
    [2, "torso"], // leftHip -> rightHip
    [3, "torso"], // rightHip -> rightShoulder
    [4, "leftarm"], // leftShoulder -> leftElbow
    [5, "leftarm"], // leftElbow -> leftWrist
    [6, "rightarm"], // rightShoulder -> rightElbow
    [7, "rightarm"], // rightElbow -> rightWrist
]);

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
    evaluateFrame(trialId: string, frameTime: number, userPose: Pose2DPixelLandmarks) {

        const referencePose = this.referenceData.getReferencePoseAtTime(frameTime);
        if (!referencePose) {
            return null;
        }

        const [qijiaOverallScore, qijiaByVectorScores] = computeSkeletonDissimilarityQijiaMethod(
            referencePose, 
            userPose
        )

        const julienScore = computeSkeleton2DDissimilarityJulienMethod(
            referencePose,
            userPose
        )

        const evaluationResult = { 
            qijiaOverallScore,
            qijiaByVectorScores,
            julienScore: julienScore.score,
            julienByVectorInfo: julienScore.infoByVetor
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

        const julienOverallScore = getArrayMean(track.evaluation.julienScore);
        const julienVectorScoreKeyValues = QijiaMethodComparisonVectors.map((vec, i) => {
            const key = QijiaMethodComparisionVectorNames[i];
            const vecScores = track.evaluation.julienByVectorInfo.map((scores) => scores[i].score);
            const meanScore = getArrayMean(vecScores);
            return [key, meanScore] as [string, number];
        });
        const julienByVectorScores = new Map(julienVectorScoreKeyValues)
        
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
            qijiaByVectorScores,
            julienOverallScore,
            julienByVectorScores
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
        let incorrectBodyPartsToHighlight: TerminalFeedbackBodyPart[] | undefined;
        let correctBodyPartsToHighlight: TerminalFeedbackBodyPart[] | undefined;

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

        if (qijiaOverallScore > evaluation_GoodBadTrialThresholdValue) {
            headline = getRandomGoodTrialHeadline();
            subHeadline = "You did great on that trial! Would you like to move on now?";
            suggestedAction = "next";
            correctBodyPartsToHighlight = [...Object.keys(TerminalFeedbackBodyParts) as TerminalFeedbackBodyPart[]];
        } else {
            headline = getRandomBadTrialHeadline();
            subHeadline = "Want to try again?";
            suggestedAction = "repeat";

            // Call out the worst body part
            const bodyPartToCallOut = ComparisonVectorToTerminalFeedbackBodyPartMap.get(worstComparisonVectorIndex);
            if (!bodyPartToCallOut) { throw new Error("Unexpected vector index: " + worstComparisonVectorIndex); }
            incorrectBodyPartsToHighlight = [bodyPartToCallOut];
        }

        return {
            headline: headline,
            subHeadline: subHeadline,
            score: {
                achieved: qijiaOverallScore,
                maximumPossible: 5.0,
            },
            suggestedAction: suggestedAction,
            incorrectBodyPartsToHighlight,
            correctBodyPartsToHighlight,
            debugJson: performanceSummary
        }
    }
}


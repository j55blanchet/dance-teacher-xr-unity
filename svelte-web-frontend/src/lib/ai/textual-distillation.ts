import type { DanceTree, DanceTreeNode } from "$lib/data/dances-store";
import { GetArithmeticMean, type BodyInnerAnglesComparisons, GetHarmonicMean } from "./EvaluationCommonUtils";
import type { FrontendPerformanceSummary } from "./FrontendDanceEvaluator";
import type { FrontendDancePeformanceHistory } from "./frontendPerformanceHistory";
import type { Angle3DMetricSummaryOutput } from "./motionmetrics/Skeleton3dVectorAngleSimilarityMetric";

function GetInaccurateJoints(skeleton3DSimilarity: Angle3DMetricSummaryOutput, badJointSDThreshold: number, overallScore?: number, overallScoreSD?: number) {

    const comparisonMean = overallScore ?? skeleton3DSimilarity.overallScore;
    const comparisonSD = overallScoreSD ?? skeleton3DSimilarity.overallScoreSD;

    const jointScoreEntries = Object.entries(skeleton3DSimilarity.individualScores);

    // get all the joints that are 1 standard deviation below the mean.
    const badJoints = jointScoreEntries
        .filter(
            ([joint, score]) => 
            score < comparisonMean - (badJointSDThreshold * comparisonSD)
        );

    return badJoints;
}

/**
 * Distills the performance summary to a condensed representation containing only the features
 * most pertinant to the AI coach (and to the user).
 * @param summary Summary of the performance
 * @returns A condensed representation of the summary, highlighting only the most important things
 */
export function distillFrontendPerformanceSummaryToTextualRepresentation(summary: FrontendPerformanceSummary, mediumScoreThreshold: number, goodScoreThreshold: number, badJointSDThreshold: number): string {

    const { wholePerformance, subsections, segmentDescription } = summary;

    const overallPerformanceScore = wholePerformance.skeleton3DAngleSimilarity.overallScore;
    const overallPerformanceSD = wholePerformance.skeleton3DAngleSimilarity.overallScoreSD;
    const overallPerformanceScoreString = overallPerformanceScore.toFixed(2);
    let distillation = `The user just performed "${segmentDescription}", at timestamp: ${new Date().toISOString()}. Overall, the user had a ${overallPerformanceScoreString} match with the reference dance.`;
    const performanceCharacterization = 
        overallPerformanceScore < mediumScoreThreshold ? "poor" :
        overallPerformanceScore < goodScoreThreshold ? "fair" :
        "good";

    distillation += ` This is considered a ${performanceCharacterization} performance.`;

    const badJoints = GetInaccurateJoints(wholePerformance.skeleton3DAngleSimilarity, badJointSDThreshold)

    if (badJoints.length > 0) {
        distillation += ` The joint angles that were the most troublesome for the user were: `;
        const badJointStrings = badJoints.map(([joint, score]) => `${joint} (match: ${score.toFixed(2)})`);
        distillation += badJointStrings.join(", ");
        distillation += `.`;
    } else {
        distillation += ` No joints angles were particularly bad.`
    }

    const subsectionNames = Object.keys(subsections);

    if (subsectionNames.length > 1) {
        // Describe subsections if there were some.
        distillation += ` The user's performance was broken down into ${subsectionNames.length} subsections:\n`;
        const subsectionEntries = Object.entries(subsections);
        const subsectionDistillationStrings = subsectionEntries.map(([subsectionName, subsection]) => {
            const angleSimilarity = subsection.skeleton3DAngleSimilarity;

            // Compare the badness of the joints relative to the distrubition of the entire performance.
            const badJoints = GetInaccurateJoints(
                wholePerformance.skeleton3DAngleSimilarity,
                badJointSDThreshold,
                overallPerformanceScore,
                overallPerformanceSD
            )
            
            const badJointNameList = badJoints.map(([jointName, _]) => jointName).join(',');
            const badJointsString = badJoints.length > 0 ? ` Troublesome joints angles: ${badJointNameList}` : 'No particularly troublesome joints';
            return `* Section "${subsectionName}" : full-body accuracy: ${angleSimilarity.overallScore.toFixed(2)}. ${badJointsString}`;
        });
      
        distillation += subsectionDistillationStrings.join("\n");
    }

    return distillation;
}

/**
 * Distills the dance tree structure to a condensed representation containing only the features
 * most pertinant to the AI coach (and to the user).
 * @param danceTree The dance tree structure
 * @returns A condensed representation of the dance tree structure, highlighting only the most important things
 */
export function distillDanceTreeStructureToTextualRepresentation(danceTree: DanceTree) {    
    return distillDanceSubTree(danceTree.root)
}

function distillDanceSubTree(danceNode: DanceTreeNode, depth = 0) {
    const nodeDuration = danceNode.end_time - danceNode.start_time;
    const nodeNoun = depth === 0 ? "The dance" : `The ${'sub'.repeat(depth-1)}section`;
    const indentation = "  ".repeat(depth);
    let subsectionList = "";
    if (danceNode.children.length > 0) {
        subsectionList += ": ";
        subsectionList += danceNode.children.slice(0, -1).map((child) => `"${child.id}"`).join(', ') + ", and " + `"${danceNode.children[danceNode.children.length-1].id}"`;
    }
    let description = `${indentation}${nodeNoun} "${danceNode.id}" is ${nodeDuration.toFixed(2)}s long, has a complexity of ${danceNode.complexity.toFixed(2)}, and has ${danceNode.children.length} subsections${subsectionList}\n`;
    danceNode.children.forEach((child) => {
        description += distillDanceSubTree(child as DanceTreeNode, depth + 1);
    });
    return description;
}

export function distillPerformanceHistoryToTextualRepresentation(dancePerformanceHistory: FrontendDancePeformanceHistory) {
    let description = "";
    for (const segmentId of Object.keys(dancePerformanceHistory)) {
        const segmentHistory = dancePerformanceHistory[segmentId];
        const skeleton3DAngleSimilarity = segmentHistory.skeleton3DAngleSimilarity ?? [];
        
        const nonnullOverallScoreAttempts = skeleton3DAngleSimilarity
            .filter((n) => n.summary.overall !== undefined)
            .map(x => ({
                date: x.date, 
                score: x.summary.overall as number,
                partOfLargerPerformance: x.partOfLargerPerformance ?? true,
            }));
        const attemptCount = nonnullOverallScoreAttempts.length;
        const secondMostRecentAttempt = nonnullOverallScoreAttempts[attemptCount - 2];
        const secondMostRecentAttemptDate = secondMostRecentAttempt?.date?.toISOString() ?? "never";
        const secondMostReceentAttemptString = secondMostRecentAttempt ? ` The next most recent attempt, performed ${secondMostRecentAttemptDate}, got a score of ${secondMostRecentAttempt?.score.toFixed(2)}` : '';
        const attemptsAsPartOfLargerPerformance = nonnullOverallScoreAttempts.filter(x => x.partOfLargerPerformance).length;
        const attemptsNotAsPartOfLargerPerformance = attemptCount - attemptsAsPartOfLargerPerformance;
        const meanScore = GetArithmeticMean(nonnullOverallScoreAttempts.map(x => x.score));
        const bestScore = Math.max(...nonnullOverallScoreAttempts.map(x => x.score));
        const worstScore = Math.min(...nonnullOverallScoreAttempts.map(x => x.score));
        description += `The user has attempted segment "${segmentId}" ${attemptsNotAsPartOfLargerPerformance} times individually, and ${attemptsAsPartOfLargerPerformance} time as a subsection of a larger performance, and has achived an average score of ${meanScore.toFixed(2)} (worst: ${worstScore.toFixed(2)}, best: ${bestScore.toFixed(2)}) on this segment.${secondMostReceentAttemptString}\n`;
    }
    return description;
}
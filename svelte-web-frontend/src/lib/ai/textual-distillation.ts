import type { DanceTree, DanceTreeNode } from "$lib/data/dances-store";
import { GetArithmeticMean, type BodyInnerAnglesComparisons } from "./EvaluationCommonUtils";
import type { FrontendPerformanceSummary } from "./FrontendDanceEvaluator";
import type { FrontendDancePeformanceHistory } from "./frontendPerformanceHistory";

/**
 * Distills the performance summary to a condensed representation containing only the features
 * most pertinant to the AI coach (and to the user).
 * @param summary Summary of the performance
 * @returns A condensed representation of the summary, highlighting only the most important things
 */
export function distillFrontendPerformanceSummaryToTextualRepresentation(summary: FrontendPerformanceSummary, mediumScoreThreshold: number, goodScoreThreshold: number): string {

    const { wholePerformance, subsections, segmentDescription } = summary;

    const overallPerformance = wholePerformance.skeleton3DAngleSimilarity.overallScore?.toFixed(2);
    let distillation = `The user just performed "${segmentDescription}". Overall, the user had a ${overallPerformance} match with the reference dance.`;
    distillation += `A match of above ${mediumScoreThreshold.toFixed(2)} is considered a "fair" performance, and a match of above ${goodScoreThreshold.toFixed(2)} is considered a "good" performance.`

    const [worstJointName, worstJointScore] = Object.entries(wholePerformance.skeleton3DAngleSimilarity.individualScores).reduce((prev, curr) => {
        const pAngleScore = prev[1] as number
        const angleScore = curr[1] as number
        if (angleScore < pAngleScore) {
            return curr;
        }
        return prev;
    }, ["null", Infinity] as [string, number]);

    distillation += ` The worst joint overall was the ${worstJointName} joint, with an accuracy of ${worstJointScore?.toFixed(2)}.`;

    const subsectionNames = Object.keys(subsections);
    const subsectionOverallScores = subsectionNames.map((name) => subsections[name].skeleton3DAngleSimilarity?.overallScore);
    const subsectionWorstJointScores = subsectionNames.map((name) => subsections[name].skeleton3DAngleSimilarity?.individualScores?.[worstJointName as keyof typeof BodyInnerAnglesComparisons ]);

    if (subsectionNames.length > 1) {
        // Describe subsections if there were some.
        distillation += ` The user's performance was broken down into ${subsectionNames.length} subsections:\n`;
        const subsectionsAndScores = subsectionNames.map((subsectionName, subsectionIndex) => {
            const score = subsectionOverallScores[subsectionIndex];
            const worstJointScore = subsectionWorstJointScores?.[subsectionIndex];
            return `* Section "${subsectionName}" : full-body: ${score?.toFixed(2)}, ${worstJointName}: ${worstJointScore?.toFixed(2)})`;
        });
        distillation += subsectionsAndScores.join("\n");
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
        const attemptsAsPartOfLargerPerformance = nonnullOverallScoreAttempts.filter(x => x.partOfLargerPerformance).length;
        const attemptsNotAsPartOfLargerPerformance = attemptCount - attemptsAsPartOfLargerPerformance;
        const meanScore = GetArithmeticMean(nonnullOverallScoreAttempts.map(x => x.score));
        const bestScore = Math.max(...nonnullOverallScoreAttempts.map(x => x.score));
        const worstScore = Math.min(...nonnullOverallScoreAttempts.map(x => x.score));
        description += `The user has attempted segment "${segmentId}" ${attemptsNotAsPartOfLargerPerformance} times individually, and ${attemptsAsPartOfLargerPerformance} time as a subsection of a larger performance, and has achived an average score of ${meanScore.toFixed(2)} (worst: ${worstScore.toFixed(2)}, best: ${bestScore.toFixed(2)}) on this segment\n`;
    }
    return description;
}
import type { DanceTree, DanceTreeNode } from "$lib/data/dances-store";
import type { FrontendPerformanceSummary } from "./FrontendDanceEvaluator";


/**
 * Distills the performance summary to a condensed representation containing only the features
 * most pertinant to the AI coach (and to the user).
 * @param summary Summary of the performance
 * @returns A condensed representation of the summary, highlighting only the most important things
 */
export function distillFrontendPerformanceSummaryToTextualRepresentation(summary: FrontendPerformanceSummary): string {

    const { wholePerformance, subsections } = summary;

    const perfPercentage = (wholePerformance.skeleton3DAngleSimilarity.overallScore * 100).toFixed(0);
    let distillation = `Overall, the user had a ${perfPercentage}% match with the reference dance.`;

    const [worstJointName, worstJointScore] = [...wholePerformance.skeleton3DAngleSimilarity.individualScores.entries()].reduce((prev, curr) => {
        const pAngleScore = prev[1] as number
        const angleScore = curr[1] as number
        if (angleScore < pAngleScore) {
            return curr;
        }
        return prev;
    }, ["null", Infinity] as [string, number]);

    const worstJointScorePercentage = (worstJointScore * 100).toFixed(0);
    distillation += ` The worst joint overall was the ${worstJointName} joint, with an accuracy of ${worstJointScorePercentage}%.`;

    const subsectionNames = Object.keys(subsections);
    const subsectionOverallScores = subsectionNames.map((name) => subsections[name].skeleton3DAngleSimilarity.overallScore);
    const subsectionWorstJointScores = subsectionNames.map((name) => subsections[name].skeleton3DAngleSimilarity.individualScores.get(worstJointName));

    if (subsectionNames.length > 1) {
        // Describe subsections if there were some.
        distillation += ` The user's performance was broken down into ${subsectionNames.length} subsections:\n`;
        const subsectionsAndScores = subsectionNames.map((subsectionName, subsectionIndex) => {
            const score = subsectionOverallScores[subsectionIndex];
            const scorePercentage = (score * 100).toFixed(0);
            const worstJointScore = subsectionWorstJointScores[subsectionIndex];
            const worstJointScorePercentage = worstJointScore ? (worstJointScore * 100).toFixed(0) : "N/A";
            return `* Section "${subsectionName}" : full-body: ${scorePercentage}%, ${worstJointName}: ${worstJointScorePercentage}%)`;
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
    let description = `${indentation}${nodeNoun} "${danceNode.id}" is ${nodeDuration.toFixed(2)}s long, has a complexity of ${danceNode.complexity.toFixed(2)}, and has ${danceNode.children.length} subsections\n`;
    danceNode.children.forEach((child) => {
        description += distillDanceSubTree(child as DanceTreeNode, depth + 1);
    });
    return description;
}
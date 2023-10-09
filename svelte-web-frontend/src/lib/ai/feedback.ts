/**
 * @file Takes raw evaluation data and creates feedback for the user's consumption
 */

import { getAllNodes, type DanceTree, makeDanceTreeSlug } from "$lib/data/dances-store";
import { TerminalFeedbackBodyParts, type TerminalFeedbackAction, type TerminalFeedbackBodyPart, type TerminalFeedback } from "$lib/model/TerminalFeedback";
import { evaluation_GoodBadTrialThreshold } from "$lib/model/settings";
import { ComparisonVectorToTerminalFeedbackBodyPartMap, QijiaMethodComparisionVectorNamesToIndexMap } from "./EvaluationCommonUtils";
import type { FrontendPerformanceSummary } from "./FrontendDanceEvaluator";
import { distillDanceTreeStructureToTextualRepresentation, distillFrontendPerformanceSummaryToTextualRepresentation, distillPerformanceHistoryToTextualRepresentation } from "./textual-distillation";
import { getRandomBadTrialHeadline, getRandomGoodTrialHeadline } from "./precomputed-feedback-msgs";
import type { FrontendDancePeformanceHistory } from "./frontendPerformanceHistory";

// Variable to store the value of the evaluation threshold, initialized to 1.0
let evaluation_GoodBadTrialThresholdValue = 1.0;
// Subscribe to changes in the evaluation threshold and update the variable
evaluation_GoodBadTrialThreshold.subscribe((value) => {
    evaluation_GoodBadTrialThresholdValue = value;
});

/**
 * Generates feedback for the user using simple rule-based approach. This can be computed locally,
 * without the need for a server call. 
 * @param qijiaByVectorScores - Map of comparison vector names to their similarity scores
 * @param qijiaOverallScore - Overall similarity score (qijia's method  )
 * @returns Terminal feedback information that can be displayed to the user
 */
export function generateFeedbackRuleBased(
    qijiaOverallScore: number,
    qijiaByVectorScores: Record<string, number>,
): TerminalFeedback {

    let headline: string;
    let subHeadline: string;
    let suggestedAction: TerminalFeedbackAction;
    let incorrectBodyPartsToHighlight: TerminalFeedbackBodyPart[] | undefined;
    let correctBodyPartsToHighlight: TerminalFeedbackBodyPart[] | undefined;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [worstComparisonVectorIndex, worstVectorScore] = Object.keys(qijiaByVectorScores).map((vectorName: string) => {
        const vectorIndex = QijiaMethodComparisionVectorNamesToIndexMap.get(vectorName);
        if (vectorIndex === undefined) { throw new Error("Unexpected vector name: " + vectorName); }
        const vectorScore = qijiaByVectorScores[vectorName];
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
        if (bodyPartToCallOut) {
            incorrectBodyPartsToHighlight = [bodyPartToCallOut];
        }
    }

    return {
        headline: headline,
        paragraphs: [subHeadline],
        score: {
            achieved: qijiaOverallScore,
            maximumPossible: 5.0,
        },
        suggestedAction: suggestedAction,
        incorrectBodyPartsToHighlight,
        correctBodyPartsToHighlight,        
    }
}

/**
 * Generate terminal feedback using the Claude LLM. 
 * @param performanceScore The overall performance score for the trial
 * @param performanceMaxScore The maximum possible performance score for the trial
 * @returns Terminal feedback information that can be displayed to the user
 */
export async function generateFeedbackWithClaudeLLM(
    danceTree: DanceTree | undefined,
    currentSectionName: string,
    performance: FrontendPerformanceSummary | undefined,
    dancePerformanceHistory: FrontendDancePeformanceHistory | undefined,
    mediumScoreThreshold: number,
    goodScoreThreshold: number,
    attemptHistory: { date: Date, score: number, segmentId: string }[],
): Promise<TerminalFeedback> {

    const danceStructureDistillation = danceTree ? distillDanceTreeStructureToTextualRepresentation(danceTree): undefined;
    const danceStructureDistillationIsMissing = danceStructureDistillation === undefined;
    const performanceDistillation = performance ? distillFrontendPerformanceSummaryToTextualRepresentation(performance, mediumScoreThreshold, goodScoreThreshold) : undefined;
    const performanceDistillationIsMissing = performanceDistillation === undefined;
    const performanceHistoryDistillation = dancePerformanceHistory ? distillPerformanceHistoryToTextualRepresentation(dancePerformanceHistory) : undefined;
    const performanceHistoryDistillationIsMissing = performanceHistoryDistillation === undefined;

    const attemptHistoryDistillation = "The last few attempts the user has tried have been: \n" +
        attemptHistory.map((attempt) => {
            const score = attempt.score.toFixed(2);
            return `* ${attempt.date.toISOString()} ${attempt.segmentId}: ${score}`;
        }).join('\n');

    console.log('Requesting feedback from Claude LLM', 
        `currentSectionName: ${currentSectionName}`,
        `danceStructureDistillationIsMissing: ${danceStructureDistillationIsMissing}`,
        `performanceDistillationIsMissing: ${performanceDistillationIsMissing}`,
        `performanceHistoryDistillationIsMissing: ${performanceHistoryDistillationIsMissing}`,);

    // Call into our API route to get the feedback message. The paramaters here
    // must match with the corresponding API route is expecting.

    const llmInput = { 
        currentSectionName,
        danceStructureDistillation, 
        performanceDistillation,
        performanceHistoryDistillation: `${performanceHistoryDistillation}\n${attemptHistoryDistillation}`,
    };

    const claudeApiData = await fetch('/restapi/get_feedback', {
        'headers': { 'Content-Type': 'application/json' },
        'method': 'POST',
        'body': JSON.stringify(llmInput),
    }).then((res) => res.json())

    const feedbackMessage = claudeApiData['feedbackMessage'];
    const claudeSuggestedNextSection = claudeApiData['nextSection'];
    const coachingMessage = claudeApiData['coachingMessage'];
    const feedbackTitle = claudeApiData['feedbackTitle'];

    let suggestedSection = currentSectionName;
    let suggestedURL = undefined;
    if (danceTree) {
        const allNodes = getAllNodes(danceTree?.root);
        const allNodeIds = allNodes.map((node) => node.id);
        if (allNodeIds.includes(claudeSuggestedNextSection)) {
            suggestedSection = claudeSuggestedNextSection;
            const danceTreeSlug = makeDanceTreeSlug(danceTree);
            suggestedURL = `/teachlesson/${danceTreeSlug}/practicenode/${suggestedSection}`;
        }
    }

    return {
        headline: feedbackTitle,
        paragraphs: [feedbackMessage, coachingMessage],
        // note the double equals here, we want to compare the string values
        suggestedAction: suggestedSection == currentSectionName ? "repeat" : "navigate", 
        navigateOptions: suggestedURL ? [{ 
            label: `Try section ${suggestedSection}`, 
            url: suggestedURL,
            nodeId: suggestedSection,
        }] : undefined,
        debug: {
            llmInput: llmInput,
            llmOutput: claudeApiData,
        }
    }
}
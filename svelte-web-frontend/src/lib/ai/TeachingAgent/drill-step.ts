
import type { FeedbackFunction } from "$lib/model/PracticeStep";
import type PracticeStep from "$lib/model/PracticeStep";
import type { TerminalFeedback, TerminalFeedbackAction } from "$lib/model/TerminalFeedback";
import { summaryFeedback_skeleton3d_goodPerformanceThreshold, summaryFeedback_skeleton3d_mediumPerformanceThreshold } from "$lib/model/settings";
import { get } from "svelte/store";
import { getLLMResponse } from "../feedback";
import { distillPracticePlan } from "../textual-distillation";

export function CreateDrillStep(
    segmentDescription: string,
    startTime: number,
    endTime: number,
): PracticeStep {
    
    const drillStep: PracticeStep = {
        segmentDescription: segmentDescription,
        startTime: startTime,
        endTime: endTime,
        id: 'drill',
        title: 'Drilling',
        interfaceMode: 'bothVideos',
        terminalFeedbackEnabled: true,
        showUserSkeleton: true,
        playbackSpeed: 0.75,
        feedbackFunction: GenerateDrillFeedback,
    }
    return drillStep;
}

const HUMAN_PROMPT = '\n\nHuman:';
const AI_PROMPT = '\n\nAssistant:';

const GenerateDrillFeedback: FeedbackFunction = async (args) => {

    let prompt = `${HUMAN_PROMPT} You are an AI dance coach and you are giving feedback to a dancer, who is learning a dance choreography from a dance video. `;

    if (args.practicePlan) {
        prompt += distillPracticePlan(args.practicePlan);
    }

    prompt += `They have performed a "${args.practiceStep?.title}" step of the dance routine, called "${args.practiceStep?.segmentDescription}", and the system has analyzed their performance. `

    let suggestedAction: TerminalFeedbackAction = 'repeat'; 
    const score = args.performanceSummary?.wholePerformance.skeleton3DAngleSimilarity.overallScore;
    const feedbackScore: TerminalFeedback["score"] = score ? {
        achieved: score,
        maximumPossible: 1,
    } : undefined;
    if (score) {
        const mediumPerformanceThreshold = get(summaryFeedback_skeleton3d_mediumPerformanceThreshold);
        const goodPerformanceThreshold = get(summaryFeedback_skeleton3d_goodPerformanceThreshold);

        if (score >= goodPerformanceThreshold) {
            suggestedAction = 'next';
            prompt += "The system has computed a score for their performance. They did well!"
        } else if (score >= mediumPerformanceThreshold) {
            suggestedAction = 'repeat';
            prompt += "The system has computed a score for their performance. They did okay."
        } else {
            suggestedAction = 'repeat';
            prompt += "The system has computed a score for their performance. They did poorly. "
        }

        if (suggestedAction === 'repeat') {
            prompt += " The system is suggesting that they repeat the current activity."
        } else if (suggestedAction === 'next') {
            prompt += " The system is suggesting that they proceed to the next activity."
        }

        prompt +=  "Can you response a message that will be spoken aloud to the user letting them know this?";

        
    } else {
        suggestedAction = 'repeat';
        prompt += "The system was not able to compute a score for their performance. As a fallback, the system suggests that they refresh the page and try again. Can you response a message that will be spoken aloud to the user letting them know this? "
    }

    prompt += 'You should take the persona of an AI dance coach, and pretend that YOU, as an young, friendly, positive AI dance coach, have made these observations, thereby mimicing the experience of learning from a human dance coach. ';

    prompt += AI_PROMPT;

    let feedbackText: string;
    try {
        feedbackText = await getLLMResponse(prompt);
    } catch (e) {
        feedbackText = "There was an error generating the feedback. Please try again."
    }
    

    const feedback: TerminalFeedback = {
        paragraphs: [
            feedbackText,
        ],
        score: feedbackScore,
        suggestedAction: 'repeat',
    }

    return feedback;
}

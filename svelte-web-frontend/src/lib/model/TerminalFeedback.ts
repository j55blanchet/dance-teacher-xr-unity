import type { EvaluationV1Result, PerformanceSummary } from "$lib/ai/UserDanceEvaluator";
import type { PerformanceEvaluationTrack } from "$lib/ai/UserEvaluationRecorder";
import type { ValueOf } from "$lib/data/dances-store";

export const TerminalFeedbackBodyParts = {
    'head': 0,
    'torso': 1,
    'leftarm': 2,
    'rightarm': 3, 
    'leftleg': 4, 
    'rightleg': 5
};
export type TerminalFeedbackBodyPart = keyof typeof TerminalFeedbackBodyParts;
export type TerminalFeedbackBodyPartIndex = ValueOf<typeof TerminalFeedbackBodyParts>;

export type TerminalFeedbackAction = 'repeat' | 'next';
export type TerminalFeedback = {
    headline: string;
    subHeadline: string; 
    suggestedAction: TerminalFeedbackAction;
    score?: {
        achieved: number;
        maximumPossible: number;
    };
    incorrectBodyPartsToHighlight?: TerminalFeedbackBodyPart[];
    correctBodyPartsToHighlight?: TerminalFeedbackBodyPart[];
    debug?: {
        performanceSummary?: PerformanceSummary;
        recordedTrack?: PerformanceEvaluationTrack<EvaluationV1Result>;
        recordedVideoUrl?: string;
    }
};
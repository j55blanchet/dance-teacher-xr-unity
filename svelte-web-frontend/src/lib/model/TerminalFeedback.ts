
import type { FrontendEvaluationTrack } from "$lib/ai/FrontendDanceEvaluator";
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

export type TerminalFeedbackAction = 'repeat' | 'next' | 'navigate';
export type TerminalFeedback = {
    headline: string;
    paragraphs: string[]; 
    suggestedAction: TerminalFeedbackAction;
    navigateOptions?: { label: string, url: string, nodeId?: string}[];
    
    score?: {
        achieved: number;
        maximumPossible: number;
    };
    incorrectBodyPartsToHighlight?: TerminalFeedbackBodyPart[];
    correctBodyPartsToHighlight?: TerminalFeedbackBodyPart[];
    debug?: {
        performanceSummary?: object;
        recordedTrack?: FrontendEvaluationTrack;
        recordedVideoUrl?: string;
        recordedVideoMimeType?: string;
        llmInput?: any;
        llmOutput?: any;
    }
};
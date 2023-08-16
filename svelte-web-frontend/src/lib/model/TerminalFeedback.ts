import type { ValueOf } from "$lib/dances-store";


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
};
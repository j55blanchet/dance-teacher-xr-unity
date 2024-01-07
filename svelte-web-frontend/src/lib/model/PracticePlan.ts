import type PracticeStep from "./PracticeStep";


export type PracticePlanActivity = {
    id: string;
    type: '';
    steps: PracticeStep[],
}

export type PracticePlanStage = {
    type: '';
    activities: PracticePlanActivity[],
}

export type PracticePlan = {
    startTime: number;
    endTime: number;
    stages: PracticePlanStage[];
}
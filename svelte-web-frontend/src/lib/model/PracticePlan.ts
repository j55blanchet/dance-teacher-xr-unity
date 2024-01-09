import type PracticeStep from "./PracticeStep";

export type PracticePlanActivityType = 
    'segment' | 'checkpoint' | 'drill' | 'finale';

export type PracticePlanActivityBase = {
    id: string;
    steps: PracticeStep[];
    title: string;

    state?: {
        completed?: boolean;
        locked?: boolean;
    }
}

export interface SegmentActivity extends PracticePlanActivityBase {
    type: 'segment';
    segmentTitle: string;
    segmentIndex: number;
    // segmentTitle: string;
}
export interface CheckpointActivity extends PracticePlanActivityBase {
    type: 'checkpoint';
}
export interface DrillActivity extends PracticePlanActivityBase {
    type: 'drill';
}
export interface FinaleActivity extends PracticePlanActivityBase {
    type: 'finale';
}

export type PracticePlanActivity = SegmentActivity | CheckpointActivity | DrillActivity | FinaleActivity;

export type PracticePlanStage = {
    // type: '';
    activities: PracticePlanActivity[],
}

export type PracticePlan = {
    startTime: number;
    endTime: number;
    stages: PracticePlanStage[];
    demoSegmentation?: {
        segmentBreaks: number[];
        segmentLabels: string[];
    }
}
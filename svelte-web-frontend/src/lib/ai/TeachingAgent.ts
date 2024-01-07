import { makeDanceTreeSlug, type Dance, type DanceTree, type DanceTreeNode, getAllLeafNodes } from '../data/dances-store'
import type PracticeStep from '$lib/model/PracticeStep';
import type { PracticeStepModeKey } from '$lib/model/PracticeStep';
import type { PracticePlan, PracticePlanActivity } from '$lib/model/PracticePlan';

// export interface UserDancePerformanceLog {
//     // markingByNode: Map<DanceTreeNode["id"], number>;
//     // similarityByNode: Map<DanceTreeNode["id"], number>;
// }

export function GeneratePracticePlan(
    dance: Dance,
    danceTree: DanceTree,
): PracticePlan {

    const CHECKPOINT_SEGMENT_COUNT = 3;

    const phraseNodes = getAllLeafNodes(
        danceTree.root,
        (node) => node.id.includes('phrase') && !node.id.includes('group'));

    const stages: PracticePlan['stages'] = [];
    let currentStage: PracticePlan['stages'][0] = {
        type: '',
        activities: [],
    };
    phraseNodes.forEach((phraseNode) => {
        if (currentStage.activities.length >= CHECKPOINT_SEGMENT_COUNT) {
            stages.push(currentStage);
            currentStage = {
                type: '',
                activities: [],
            };
        }

        const phraseNodeActivity: PracticePlanActivity = {
            id: phraseNode.id,
            type: '',
            steps: [], // todo: mark > drill > full-out
        };
        currentStage.activities.push(phraseNodeActivity);
    })
    stages.push(currentStage);

    return {
        startTime: danceTree.root.start_time,
        endTime: danceTree.root.end_time,
        stages: stages,
    }
}

export type GeneratePracticeStepOptions = {
    playbackSpeed: number,
    interfaceMode: PracticeStepModeKey,
    terminalFeedbackEnabled: boolean,
    showUserSkeleton: boolean,
};

export function GeneratePracticeStep(
    dance: Dance,
    danceTree: DanceTree,
    danceTreeNode: DanceTreeNode,
    opts: GeneratePracticeStepOptions
) {
    
    const danceTreeSlug =  makeDanceTreeSlug(danceTree);
    return {
        step: {
            segmentDescription: danceTreeNode.id,
            startTime: danceTreeNode.start_time,
            endTime: danceTreeNode.end_time,
            interfaceMode: opts.interfaceMode,
            terminalFeedbackEnabled: opts.terminalFeedbackEnabled,
            showUserSkeleton: opts.showUserSkeleton,
            playbackSpeed: opts.playbackSpeed,
            dance: dance,
            danceTree: danceTree,
            danceTreeNode: danceTreeNode,
        } as PracticeStep,
        url: `/teachlesson/${danceTreeSlug}/practicenode/${danceTreeNode.id}?playbackSpeed=${opts.playbackSpeed}&interfaceMode=${opts.interfaceMode}&terminalFeedbackEnabled=${opts.terminalFeedbackEnabled}&showUserSkeleton=${opts.showUserSkeleton}`,
    }
}


// {
//     referenceVideo: {
//         visibility: 'visible',
//         skeleton: 'none',
//         userCanToggleOnOff: false,
//         skeletonColorCoding: false,
//     },
//     userVideo: {
//         visibility: 'visible',
//         skeleton: 'user',
//         userCanToggleOnOff: false,
//         skeletonColorCoding: true,
//     },
//     terminalFeedback: 'enabled',
// },
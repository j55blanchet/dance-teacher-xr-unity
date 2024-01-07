import { makeDanceTreeSlug, type Dance, type DanceTree, type DanceTreeNode } from '../data/dances-store'
import type PracticeStep from '$lib/model/PracticeStep';
import type { PracticeStepModeKey } from '$lib/model/PracticeStep';

// export interface UserDancePerformanceLog {
//     // markingByNode: Map<DanceTreeNode["id"], number>;
//     // similarityByNode: Map<DanceTreeNode["id"], number>;
// }

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
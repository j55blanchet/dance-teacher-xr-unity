import { makeDanceTreeSlug, type Dance, type DanceTree, type DanceTreeNode } from '../data/dances-store'
import type PracticeActivity from '$lib/model/PracticeActivity';
import type { PracticeInterfaceModeKey } from '$lib/model/PracticeActivity';

// export interface UserDancePerformanceLog {
//     // markingByNode: Map<DanceTreeNode["id"], number>;
//     // similarityByNode: Map<DanceTreeNode["id"], number>;
// }


export type GeneratePracticeActivityOptions = {
    playbackSpeed: number,
    interfaceMode: PracticeInterfaceModeKey,
    terminalFeedbackEnabled: boolean,
    userSkeletonColorCodingEnabled: boolean,
};

export function GeneratePracticeActivity(
    dance: Dance,
    danceTree: DanceTree,
    danceTreeNode: DanceTreeNode,
    opts: GeneratePracticeActivityOptions
) {
    
    const danceTreeSlug =  makeDanceTreeSlug(danceTree);
    return {
        activity: {
            segmentDescription: danceTreeNode.id,
            startTime: danceTreeNode.start_time,
            endTime: danceTreeNode.end_time,
            interfaceMode: opts.interfaceMode,
            terminalFeedbackEnabled: opts.terminalFeedbackEnabled,
            userSkeletonColorCodingEnabled: opts.userSkeletonColorCodingEnabled,
            playbackSpeed: opts.playbackSpeed,
            dance: dance,
            danceTree: danceTree,
            danceTreeNode: danceTreeNode,
        },
        url: `/teachlesson/${danceTreeSlug}/practicenode/${danceTreeNode.id}?playbackSpeed=${opts.playbackSpeed}&interfaceMode=${opts.interfaceMode}&terminalFeedbackEnabled=${opts.terminalFeedbackEnabled}&userSkeletonColorCodingEnabled=${opts.userSkeletonColorCodingEnabled}`,
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
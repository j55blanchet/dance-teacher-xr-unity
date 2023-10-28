import { makeDanceTreeSlug, type Dance, type DanceTree, type DanceTreeNode } from '../data/dances-store'
import type PracticeActivity from '$lib/model/PracticeActivity';
import type { PracticeInterfaceModeKey } from '$lib/model/PracticeActivity';

// export interface UserDancePerformanceLog {
//     // markingByNode: Map<DanceTreeNode["id"], number>;
//     // similarityByNode: Map<DanceTreeNode["id"], number>;
// }

export function GeneratePracticeActivity(opts: {
    dance: Dance,
    danceTree: DanceTree,
    danceTreeNode: DanceTreeNode,
    playbackSpeed: number | 'default',
    interfaceMode: PracticeInterfaceModeKey,
    terminalFeedbackEnabled: boolean,
    enableUserSkeletonColorCoding: boolean,
}) {
    
    const danceTreeSlug =  makeDanceTreeSlug(opts.danceTree);
    return {
        activity: {
            segmentDescription: opts.danceTreeNode.id,
            startTime: opts.danceTreeNode.start_time,
            endTime: opts.danceTreeNode.end_time,
            interfaceMode: opts.interfaceMode,
            terminalFeedbackEnabled: true,
            enableUserSkeletonColorCoding: opts.enableUserSkeletonColorCoding,
            playbackSpeed: opts.playbackSpeed,
            dance: opts.dance,
            danceTree: opts.danceTree,
            danceTreeNode: opts.danceTreeNode,
        },
        url: `/teachlesson/${danceTreeSlug}/practicenode/${opts.danceTreeNode.id}?playbackSpeed=${opts.playbackSpeed}&interfaceMode=${opts.interfaceMode}&terminalFeedbackEnabled=${opts.terminalFeedbackEnabled}`,
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
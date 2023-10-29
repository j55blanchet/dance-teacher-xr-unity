import type { Dance, DanceTree, DanceTreeNode } from "$lib/data/dances-store";


export type PracticeActivityInterfaceSettings = {
    referenceVideo: {
        visibility: 'visible' | 'hidden',
        skeleton: 'user' | 'reference' | 'none',
    },
    userVideo: {
        visibility: 'visible' | 'hidden',
        skeleton: 'user' | 'reference' | 'none',
    },
}
// 1. When marking, users will want to see the reference video, and 
//    possibly themselves. They might want to test their marking by seeing
//    only the virtual mirror. We shouldn't provide any live or terminal feedback.
//    They should be able to review a recording of their performance.
//
//    * User only needs a skeleton over their own video in order to get in frame?
//
// 2. When drilling, the user will have a variety of needs. They may want to:
//      - See the reference video, with a skeleton of themselves overlaid
//      - See their own video, with a skeleton of the reference overlaid
//      - See both videos, with a skeleton of themselves overlaid

export const PracticeInterfaceModes = {
    watchDemo : {
        referenceVideo: {
            visibility: 'visible',
            skeleton: 'none',
        },
        userVideo: {
            visibility: 'hidden',
        skeleton: 'none',
        },
    } as PracticeActivityInterfaceSettings,

    userVideoOnly : {
        referenceVideo: {
            visibility: 'hidden',
            skeleton: 'none',
        },
        userVideo: {
            visibility: 'visible',
            skeleton: 'user',
        },
    } as PracticeActivityInterfaceSettings,

    bothVideos : {
        referenceVideo: {
            visibility: 'visible',
            skeleton: 'none',
        },
        userVideo: {
            visibility: 'visible',
            skeleton: 'user',
        },
    } as PracticeActivityInterfaceSettings,
} as const;

export type PracticeInterfaceModeKey = keyof typeof PracticeInterfaceModes;
export const PracticeInterfaceModeOptions: Record<PracticeInterfaceModeKey, string> = {
    watchDemo: 'Demo Video',
    userVideoOnly: 'Demo + Mirror',
    bothVideos: 'Mirror',
} as const;
export const PracticeActivityDefaultInterfaceSetting: PracticeInterfaceModeKey = 'bothVideos';
export default interface PracticeActivity {
    startTime: number;
    endTime: number;
    interfaceMode: PracticeInterfaceModeKey;
    terminalFeedbackEnabled: boolean;
    showUserSkeleton: boolean;
    playbackSpeed: number;
    segmentDescription: string;
    dance?: Dance;
    danceTree?: DanceTree;
    danceTreeNode?: DanceTreeNode;
};
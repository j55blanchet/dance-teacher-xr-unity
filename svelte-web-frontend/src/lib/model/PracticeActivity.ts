import type { Dance, DanceTree, DanceTreeNode } from "$lib/data/dances-store";

export default interface PracticeActivity {
    startTime: number;
    endTime: number;
    activityTypes: Array<'watch' | 'mark' | 'drill' | 'fullout'>;
    playbackSpeed: number;
    segmentDescription: string;
    dance?: Dance;
    danceTree?: DanceTree;
    danceTreeNode?: DanceTreeNode;
};
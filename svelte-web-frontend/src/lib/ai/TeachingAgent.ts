import type { Dance, DanceTree, DanceTreeNode } from '../data/dances-store'
import type PracticeActivity from '$lib/model/PracticeActivity';

// export interface UserDancePerformanceLog {
//     // markingByNode: Map<DanceTreeNode["id"], number>;
//     // similarityByNode: Map<DanceTreeNode["id"], number>;
// }

export function GeneratePracticeActivity(
    dance: Dance,
    danceTree: DanceTree,
    danceTreeNode: DanceTreeNode,
    playbackSpeed: number | 'default',
    // userDancePerformanceLog: UserDancePerformanceLog
): PracticeActivity {
    return {
        segmentDescription: danceTreeNode.id,
        startTime: danceTreeNode.start_time,
        endTime: danceTreeNode.end_time,
        activityTypes: ['drill'], // 'watch', 'mark', 'drill', 'fullout']
        playbackSpeed,
        dance,
        danceTree,
        danceTreeNode,
    }
}

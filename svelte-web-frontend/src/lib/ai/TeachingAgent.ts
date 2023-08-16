import type { Dance, DanceTree, DanceTreeNode } from '../dances-store'
import type PracticeActivity from '$lib/model/PracticeActivity';

// export interface UserDancePerformanceLog {
//     // markingByNode: Map<DanceTreeNode["id"], number>;
//     // similarityByNode: Map<DanceTreeNode["id"], number>;
// }


export function GeneratePracticeActivity(
    dance: Dance,
    danceTree: DanceTree,
    danceTreeNode: DanceTreeNode,
    // userDancePerformanceLog: UserDancePerformanceLog
): PracticeActivity {
    return {
        startTime: danceTreeNode.start_time,
        endTime: danceTreeNode.end_time,
        activityTypes: ['drill'], // 'watch', 'mark', 'drill', 'fullout']
        playbackSpeed: 0.50,
    }
}

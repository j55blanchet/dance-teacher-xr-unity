import { formatOrdinals } from "$lib/utils/formatting";
import type { FrontendDancePeformanceHistory } from "./frontendPerformanceHistory";

export const OutputTarget = Object.freeze({
    user: 'user',
    system: 'system'
});
export type OutputTargetType = keyof typeof OutputTarget;

export type AchievementParams = {
    performanceHistory: FrontendDancePeformanceHistory;
    attemptedNodeId: string;
    outputTarget: OutputTargetType;
}

const SINGLE_NODE_ATTEMPT_ACHIEVEMENTS = new Map([
        [5, 'Good job!'], 
        [10, 'Nice work!'], 
        [15, 'Great persistance!'], 
        [20, 'Incredible persistence!'],
]);

export function getSingleNodeAttemptAchivement(attemptCount: number, sectionName: string, outputTarget: OutputTargetType) {
    const exalamation = SINGLE_NODE_ATTEMPT_ACHIEVEMENTS.get(attemptCount);
    if (exalamation === undefined) {
        return null;
    }

    if (outputTarget === OutputTarget.user) {
        return `${exalamation} That was your ${formatOrdinals(attemptCount)} attempt for section '${sectionName}'!`
    }
    if (outputTarget === OutputTarget.system) {
        return `User has attempted section '${sectionName}' ${attemptCount} times.`
    }
    
    throw new Error('Unknown output target: ' + outputTarget);
}


const defaultAllNodeAchievementSuffixFunction = (attemptCount: number) => `That was your ${formatOrdinals(attemptCount)} attempt!`;
const ALL_NODES_ATTEMPT_ACHIEVEMENTS = new Map([
    [1, { prefix: 'Great start!', suffixFn: (attemptCount: number) => `You've completed your ${formatOrdinals(attemptCount)} attempt!` }],
    [5, { prefix: 'That a way!', suffixFn: defaultAllNodeAchievementSuffixFunction }],
    [10, { prefix: 'Keep it up!', suffixFn: (attemptCount: number) => `You've reached ${attemptCount} total attempts!` }],
    [25, { prefix: 'Amazing!', suffixFn: defaultAllNodeAchievementSuffixFunction }],
    [40, { prefix: "You're a rockstar!", suffixFn: defaultAllNodeAchievementSuffixFunction }],
    [50, { prefix: 'Incredible!', suffixFn: defaultAllNodeAchievementSuffixFunction }],
    [100, { prefix: 'Absolutely incredible!', suffixFn: defaultAllNodeAchievementSuffixFunction }],
]);

export function getAllNodesAttemptAchievement(attemptCount: number, outputTarget: OutputTargetType) {
    const exalamation = ALL_NODES_ATTEMPT_ACHIEVEMENTS.get(attemptCount);
    if (exalamation === undefined) { 
        return null; 
    }

    if (outputTarget === OutputTarget.user) {
        return `${exalamation.prefix} ${exalamation.suffixFn(attemptCount)}`;
    }
    if (outputTarget === OutputTarget.system) {
        return `User has reached ${attemptCount} attempts total across all practice sections.`
    }
    
    throw new Error('Unknown output target: ' + outputTarget);
}

export default function detectAchievements(params: AchievementParams): string[] {
    
    let achievements = [] as string[];

    const singleNodeAttemptCount = getAttemptCount(params, 1, 'attemptedNode');
    const singleNodeAchivement = getSingleNodeAttemptAchivement(singleNodeAttemptCount, params.attemptedNodeId, params.outputTarget);
    if (singleNodeAchivement) {
        achievements.push(singleNodeAchivement);
    }

    const allNodeAttemptCounts = getAttemptCount(params, 1, 'allNodes');
    const allNodeAchivement = getAllNodesAttemptAchievement(allNodeAttemptCounts, params.outputTarget);
    if (allNodeAchivement) {
        achievements.push(allNodeAchivement);
    }

    // achievements.push('Congrats! You have an achievement!');

    return achievements
}

export function getAttemptCount(params: AchievementParams, nTrials: number, target: 'attemptedNode' | 'allNodes'): number {

    let attemptCount: number;
    if (target === 'attemptedNode') {
        const basicMetricEntries = params.performanceHistory?.[params.attemptedNodeId]?.basicInfo ?? [];
        attemptCount = basicMetricEntries.filter(x => x.partOfLargerPerformance === false).length;
    }
    else if (target === 'allNodes') {
        const allSegmentEntries = params.performanceHistory ?? {};
        attemptCount = Object.values(allSegmentEntries).flatMap(x => x.basicInfo ?? []).filter(x => x.partOfLargerPerformance === false).length;
    } else {
        throw new Error('Unknown target: ' + target);
    }

    return attemptCount;
}


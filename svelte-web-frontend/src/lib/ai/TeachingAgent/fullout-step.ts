
import type PracticeStep from "$lib/model/PracticeStep";

export function CreateFulloutStep(
    segmentDescription: string,
    startTime: number,
    endTime: number,
): PracticeStep {
    
    const fulloutStep: PracticeStep = {
        segmentDescription: segmentDescription,
        startTime: startTime,
        endTime: endTime,
        id: 'fullOut',
        title: 'Full Out',
        interfaceMode: 'userVideoOnly',
        terminalFeedbackEnabled: true,
        showUserSkeleton: false,
        playbackSpeed: 1,
    }
    return fulloutStep;
}
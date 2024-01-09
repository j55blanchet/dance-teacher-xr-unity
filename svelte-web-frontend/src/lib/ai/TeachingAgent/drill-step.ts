
import type PracticeStep from "$lib/model/PracticeStep";

export function CreateDrillStep(
    segmentDescription: string,
    startTime: number,
    endTime: number,
): PracticeStep {
    
    const drillStep: PracticeStep = {
        segmentDescription: segmentDescription,
        startTime: startTime,
        endTime: endTime,
        id: 'drill',
        title: 'Drilling',
        interfaceMode: 'bothVideos',
        terminalFeedbackEnabled: true,
        showUserSkeleton: true,
        playbackSpeed: 0.75,
    }
    return drillStep;
}
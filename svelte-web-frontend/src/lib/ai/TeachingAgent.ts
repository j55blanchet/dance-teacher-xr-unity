import { makeDanceTreeSlug, type Dance, type DanceTree, type DanceTreeNode, getAllLeafNodes } from '../data/dances-store'
import type PracticeStep from '$lib/model/PracticeStep';
import type { PracticeStepModeKey } from '$lib/model/PracticeStep';
import type { CheckpointActivity, DrillActivity, FinaleActivity, PracticePlan, SegmentActivity } from '$lib/model/PracticePlan';

// export interface UserDancePerformanceLog {
//     // markingByNode: Map<DanceTreeNode["id"], number>;
//     // similarityByNode: Map<DanceTreeNode["id"], number>;
// }

function GenerateMarkDrillFulloutSteps(
    segmentDescription: string,
    startTime: number,
    endTime: number,
) {
    const stepBase = {
        segmentDescription: segmentDescription,
        startTime: startTime,
        endTime: endTime,
    } satisfies Partial<PracticeStep>;

    const mark: PracticeStep = {
        ...stepBase,
        id: 'mark',
        title: 'Mark',
        interfaceMode: 'watchDemo',
        terminalFeedbackEnabled: false,
        showUserSkeleton: false,
        playbackSpeed: 0.5,
    };

    const drill: PracticeStep = {
        ...stepBase,
        id: 'drill',
        title: 'Drill',
        interfaceMode: 'bothVideos',
        terminalFeedbackEnabled: true,
        showUserSkeleton: true,
        playbackSpeed: 0.75,
    };
    
    const fullOut: PracticeStep = {
        ...stepBase,
        id: 'fullOut',
        title: 'Full Out',
        interfaceMode: 'userVideoOnly',
        terminalFeedbackEnabled: true,
        showUserSkeleton: false,
        playbackSpeed: 1,
    };
    return [mark, drill, fullOut];
}

function GenerateStepsForSegment(
    node: DanceTreeNode,
) {
    const steps = GenerateMarkDrillFulloutSteps(
        `node:${node.id}`,
        node.start_time,
        node.end_time,
    );

    steps.forEach((step) => {
        step.danceTreeNode = node;
        step.segmentDescription = node.id;
    });

    return steps;
}

function getSegementLabel(segmentIndex: number, segmentCountTotal: number) {

    // If there are enough letters in the alphabet to label each segment, use letters
    if (segmentCountTotal < 26) {
        const segmentLabel = String.fromCharCode(65 + segmentIndex); // Uppercase letter at the index of the alphabet
        return segmentLabel;
    }

    // Otherwise, use numbers
    return `${segmentIndex + 1}`;
}

function makeCheckpointActivity(segmentActivities: SegmentActivity[]): CheckpointActivity {
    const checkpointLabel = segmentActivities
        .map((segmentActivity) => segmentActivity.segmentTitle)
        .join('-');

    return {
        id: checkpointLabel,
        type: 'checkpoint',
        steps: GenerateMarkDrillFulloutSteps(
            checkpointLabel,
            segmentActivities[0].steps[0].startTime,
            segmentActivities[segmentActivities.length - 1].steps[0].endTime,
        ),
    }
}

function makeDrillActivity(startTime: number, endTime: number): DrillActivity {
    return {
        id: `drill-${startTime}-${endTime}`,
        type: 'drill',
        steps: GenerateMarkDrillFulloutSteps(
            `drill-${startTime}-${endTime}`,
            startTime,
            endTime,
        ),
    }
}

function makeFinaleActivity(startTime: number, endTime: number): FinaleActivity {
    return {
        id: `finale`,
        type: 'finale',
        steps: [{
            id: `finale`,
            title: 'Finale',
            segmentDescription: `finale`,
            startTime: startTime,
            endTime: endTime,
            interfaceMode: 'userVideoOnly',
            terminalFeedbackEnabled: false,
            showUserSkeleton: false,
            playbackSpeed: 1,
        }]
    }
}

export function GeneratePracticePlan(
    dance: Dance,
    danceTree: DanceTree,
): PracticePlan {

    const CHECKPOINT_SEGMENT_COUNT = 3;

    const phraseNodes = getAllLeafNodes(
        danceTree.root,
        (node) => node.id.includes('phrase') && !node.id.includes('group'));

    const stages: PracticePlan['stages'] = [];
    let currentStage: PracticePlan['stages'][0] = {
        // type: '',
        activities: [],
    };
    let currentSegmentIndex = 0;
    phraseNodes.forEach((phraseNode) => {
        if (currentStage.activities.length >= CHECKPOINT_SEGMENT_COUNT) {
            currentStage.activities.push(makeCheckpointActivity(currentStage.activities as SegmentActivity[]));
            stages.push(currentStage);
            currentStage = {
                // type: '',
                activities: [],
            };
        }

        const segmentActivity: SegmentActivity = {
            id: `segment-${phraseNode.id}`,
            type: 'segment',
            steps: GenerateStepsForSegment(phraseNode), // todo: mark > drill > full-out
            segmentTitle: getSegementLabel(currentSegmentIndex, phraseNodes.length),
        };
        currentStage.activities.push(segmentActivity);
        currentSegmentIndex += 1;
    })
    currentStage.activities.push(makeCheckpointActivity(currentStage.activities as SegmentActivity[]));
    stages.push(currentStage);

    stages.push({
        // type: '',
        activities: [
            makeDrillActivity(danceTree.root.start_time, danceTree.root.end_time),
            makeFinaleActivity(danceTree.root.start_time, danceTree.root.end_time),
        ],
    });
    return {
        startTime: danceTree.root.start_time,
        endTime: danceTree.root.end_time,
        stages: stages,
        demoSegmentation: {
            segmentBreaks: phraseNodes.slice(1).map((node) => node.start_time),
            segmentLabels: phraseNodes.map((node, index) => getSegementLabel(index, phraseNodes.length)),
        },
    }
}

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
            id: 'legacystep',
            title: danceTreeNode.id,
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
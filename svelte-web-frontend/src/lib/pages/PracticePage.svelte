<script context="module" lang="ts">
export type PracticePageState = "waitWebcam" | "waitStart" | 'waitStartUserInteraction' | "countdown" | "playing" | "paused" | "feedback";
export const INITIAL_STATE: PracticePageState = "waitWebcam";
</script>
<script lang="ts">
import { danceVideoVolume, debugMode__addPlaceholderAchievement, metric__3dskeletonsimilarity__badJointStdDeviationThreshold, practiceActivities__enablePerformanceRecording, practiceActivities__interfaceMode, practiceActivities__terminalFeedbackEnabled, practiceActivities__showUserSkeleton } from './../model/settings';
import { v4 as generateUUIDv4 } from 'uuid';
import { evaluation_summarizeSubsections, practiceActivities__playbackSpeed, summaryFeedback_skeleton3d_mediumPerformanceThreshold, summaryFeedback_skeleton3d_goodPerformanceThreshold } from '$lib/model/settings';
// import { replaceJSONForStringifyDisplay } from '$lib/utils/formatting';
import { findDanceTreeNode, getAllLeafNodes, getAllNodesInSubtree, makeDanceTreeSlug } from '$lib/data/dances-store';
import { pauseInPracticePage, debugPauseDurationSecs, debugMode, useAIFeedback } from '$lib/model/settings';
import { GetPixelLandmarksFromNormalizedLandmarks, type Pose3DLandmarkFrame } from '$lib/webcam/mediapipe-utils';
import type PracticeStep from "$lib/model/PracticeStep";
import { getDanceVideoSrc, load2DPoseInformation, type Dance, type PoseReferenceData, load3DPoseInformation, type DanceTreeNode } from "$lib/data/dances-store";
import { generateFeedbackNoPerformance, generateFeedbackRuleBased, generateFeedbackWithClaudeLLM } from '$lib/ai/feedback';
import { Draw2dSkeleton } from '$lib/ai/SkeletonFeedbackVisualization'
import VideoWithSkeleton from "$lib/elements/VideoWithSkeleton.svelte";
import VirtualMirror from "$lib/elements/VirtualMirror.svelte";
import metronomeClickSoundSrc from '$lib/media/audio/metronome.mp3';
import { onMount, createEventDispatcher, tick, getContext } from "svelte";
import { webcamStream } from '$lib/webcam/streams';
import { MirrorXPose, type Pose2DPixelLandmarks } from '$lib/webcam/mediapipe-utils';
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { TerminalFeedback } from '$lib/model/TerminalFeedback';
import TerminalFeedbackScreen from '$lib/elements/TerminalFeedbackScreen.svelte';
import { getFrontendDanceEvaluator, type FrontendDanceEvaluator, type FrontendPerformanceSummary, type FrontendLiveEvaluationResult, type FrontendEvaluationTrack } from '$lib/ai/FrontendDanceEvaluator';
import ProgressEllipses from '$lib/elements/ProgressEllipses.svelte';
import type { NodeHighlight } from '$lib/elements/DanceTreeVisual.svelte';
import DanceTreeVisual from '$lib/elements/DanceTreeVisual.svelte';
import { goto, invalidateAll } from '$app/navigation';
import { GeneratePracticeStep, type GeneratePracticeStepOptions } from '$lib/ai/TeachingAgent';
import frontendPerformanceHistory from '$lib/ai/frontendPerformanceHistory';
import Dialog from '$lib/elements/Dialog.svelte';
import { browser } from '$app/environment';
import { waitSecs } from '$lib/utils/async';
import { PracticeStepDefaultInterfaceSetting, PracticeInterfaceModes, type PracticeStepInterfaceSettings } from '$lib/model/PracticeStep';
import PracticeActivityConfigurator from '$lib/elements/PracticeActivityConfigurator.svelte';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabase = getContext('supabase') as SupabaseClient;

export let mirrorForEvaluation: boolean = true;
export let dance: Dance;
export let practiceStep: PracticeStep | null;
export let pageActive = false;
export let flipVideo: boolean = false;

let interfaceSettings: PracticeStepInterfaceSettings = PracticeInterfaceModes[PracticeStepDefaultInterfaceSetting];
$: interfaceSettings = PracticeInterfaceModes[practiceStep?.interfaceMode ?? PracticeStepDefaultInterfaceSetting];
let skeletonDrawingEnabled: boolean;
$: skeletonDrawingEnabled = practiceStep?.showUserSkeleton ?? true;
let terminalFeedbackEnabled: boolean;
$: terminalFeedbackEnabled = practiceStep?.terminalFeedbackEnabled ?? true;

let isDoingSomeSortOfFeedback = false;
$: {
    isDoingSomeSortOfFeedback = (practiceStep?.terminalFeedbackEnabled ?? false)
        || (skeletonDrawingEnabled && interfaceSettings.referenceVideo.visibility === 'visible' && interfaceSettings.referenceVideo.skeleton === 'user')
        || (skeletonDrawingEnabled && interfaceSettings.userVideo.visibility === 'visible' && interfaceSettings.userVideo.skeleton === 'user');
}

let hasVisibleReferenceVideo: boolean;
$: hasVisibleReferenceVideo = interfaceSettings.referenceVideo.visibility === 'visible';

let hasUserWebcamVisible: boolean;
$: hasUserWebcamVisible = interfaceSettings.userVideo.visibility === 'visible' ||
    isDoingSomeSortOfFeedback && state === 'waitWebcam';

const dispatch = createEventDispatcher<{
    stateChanged: PracticePageState;
    'continue-clicked': undefined;
    stepCompleted: undefined;
}>();

let fitVideoToFlexbox = true;

let state: PracticePageState = INITIAL_STATE;
$: console.log("PracticePage state", state);
$: dispatch('stateChanged', state); 

let isPlayingOrCountdown: boolean;
$: isPlayingOrCountdown = state === "playing" || state === "countdown";
let isShowingFeedback: boolean;
$: isShowingFeedback = state === 'feedback';
let isMounted = false;
let isShowingNextActivityConfigurator = false;

let currentActivityStepIndex: number = 0;

let containingDanceTreeLeafNodes = [] as DanceTreeNode[];
$: {
    if (practiceStep?.danceTreeNode && $evaluation_summarizeSubsections == "leafnodes") {
        containingDanceTreeLeafNodes = getAllLeafNodes(practiceStep.danceTreeNode).filter((node) => node.id !== practiceStep?.danceTreeNode?.id);
    } else if (practiceStep?.danceTreeNode && $evaluation_summarizeSubsections == "allnodes") {
        containingDanceTreeLeafNodes = getAllNodesInSubtree(practiceStep.danceTreeNode).filter((node) => node.id !== practiceStep?.danceTreeNode?.id);
    }else {
        containingDanceTreeLeafNodes = [];
    }
}

let beatDuration = 1;
$: {
    const danceBpm = dance?.bpm ?? 60;
    const danceSecsPerBeat = 60 / danceBpm;
    beatDuration = danceSecsPerBeat / videoPlaybackSpeed;
}

let clickAudioElement: HTMLAudioElement;
let virtualMirrorElement: VirtualMirror;
let videoWithSkeleton: VideoWithSkeleton;
let videoCurrentTime: number = 0;
let videoPlaybackSpeed: number = 1;
let videoDuration: number = 0;
let videoVolume: number = 0.5;
$: console.log("VideoDuration", videoDuration);
let isVideoPausedBinding: boolean = true;
let showStartCountdownDialog = false;
let danceSrc: string = '';
let poseEstimationEnabled: boolean = false;
let poseEstimationReady: Promise<void> | null = null;
let referenceDancePoses2D: PoseReferenceData<Pose2DPixelLandmarks> | null = null;
let referenceDancePoses3D: PoseReferenceData<Pose3DLandmarkFrame> | null = null;

let lastEvaluationResult: FrontendLiveEvaluationResult | null = null;
let evaluator: FrontendDanceEvaluator | null = null;
let trialId = null as string | null;
$: console.log('trialId changed, now is: ', trialId);
let performanceSummary: FrontendPerformanceSummary | null = null;
let terminalFeedback: TerminalFeedback | null = null;
let nodeHighlights = {} as Record<string, NodeHighlight>;
$: {
    const currentNodeId = practiceStep?.danceTreeNode?.id;
    const terminalFeedbackNavOptions = terminalFeedback?.navigateOptions ?? [];
    const navOptionsSuggestingANode = terminalFeedbackNavOptions.filter(opt => opt.nodeId);
   
    const defaultHighlight: NodeHighlight = {
        color: 'var(--color-theme-1, yellow)',
        pulse: true,
    };
    nodeHighlights = Object.fromEntries(
        navOptionsSuggestingANode.map(navOpts => {
            if (currentNodeId && navOpts.nodeId === currentNodeId) {
                return [navOpts.nodeId, {
                    ...defaultHighlight,
                    label: navOpts.nodeId + ' 🔁'
                }]
            }
            return [navOpts.nodeId, {
                ...defaultHighlight,
                label: `${navOpts.nodeId} ➡️`
            }]
        })
    );

    // If we've just performed an segment and aren't suggesting to repeat it,
    // we will highlight the segment we just performed.
    if (isShowingFeedback && currentNodeId && nodeHighlights[currentNodeId] === undefined) {
        nodeHighlights[currentNodeId] = {
            color: 'var(--color-text, green)',
            pulse: false,
            label: terminalFeedback?.suggestedAction === "repeat" ? `${currentNodeId} 🔁` : `✔️ ${currentNodeId}`,
        }
    }
}

async function onNodeClickedById(id: string) {
    // find node;
    if (!practiceStep) return;
    const node = findDanceTreeNode(practiceStep.danceTree as any, id);

    if (!node) {
        console.warn("Ignoring onNodeClickedById: can't find node with id: " + id);
    }
    return onNodeClicked(node as DanceTreeNode);
}

// Base the settings for the next practice activity based on the current one
let nextPracticeActivityParams: GeneratePracticeStepOptions = {
    playbackSpeed: practiceStep?.playbackSpeed ?? $practiceActivities__playbackSpeed,
    interfaceMode: practiceStep?.interfaceMode ?? $practiceActivities__interfaceMode,
    terminalFeedbackEnabled: practiceStep?.terminalFeedbackEnabled ?? $practiceActivities__terminalFeedbackEnabled,
    showUserSkeleton: practiceStep?.showUserSkeleton ?? $practiceActivities__showUserSkeleton,
}

async function onNodeClicked(clickedNode: DanceTreeNode) {
    if (isPlayingOrCountdown) return;

    if (!practiceStep?.dance || !practiceStep.danceTree) return;
    const dance = practiceStep.dance;
    const danceTree = practiceStep.danceTree;
    const danceTreeSlug = makeDanceTreeSlug(practiceStep.danceTree);
    const nodeSlug = clickedNode.id;
        
    let { step: newActivity, url} = await GeneratePracticeStep(
        dance, 
        danceTree, 
        clickedNode, 
        nextPracticeActivityParams,
    );
    await goto(url);

    practiceStep = newActivity;
    await reset();
}

let countdown = -1;
let countdownActive = false;

const debugPauseDuration = 10.0; // if pauseInPracticePage is enabled, we'll pause for this many seconds midway through playback
let currentPlaybackEndtime = practiceStep?.endTime ?? 0;

let webcamRecorderMimeType = 'video/webm';
let webcamRecorder: MediaRecorder | null = null;
let webcamRecordedChunks: Blob[] = [];

let resolveWebcamRecordedObjectUrl: ((url: string) => void) | null = null;  
let rejectWebcamRecordedObjectUrl: ((reason?: any) => void) | null = null;
let webcamRecordedObjectURL: Promise<string> | null = null;

$: {
    danceSrc = getDanceVideoSrc(supabase, dance);
}

$: {
    poseEstimationEnabled = pageActive 
        && isDoingSomeSortOfFeedback 
        &&  (countdownActive || !isVideoPausedBinding || state==="paused");
}

let lastNAttemptsAngleSimilarity = frontendPerformanceHistory.lastNAttempts(
    practiceStep?.dance?.clipRelativeStem ?? 'undefined',
    'skeleton3DAngleSimilarity',
    20,
);
$: {
    lastNAttemptsAngleSimilarity = frontendPerformanceHistory.lastNAttempts(
        practiceStep?.dance?.clipRelativeStem ?? 'undefined',
        'skeleton3DAngleSimilarity',
        20,
    )
}

let unpauseVideoTimeout: number | null  = null;
function unPauseVideo() {
    unpauseVideoTimeout = null;
    currentPlaybackEndtime = practiceStep?.endTime ?? videoDuration;
    isVideoPausedBinding = false;
    state = "playing";
}


async function getFeedback(performanceSummary: FrontendPerformanceSummary | null, recordedTrack:  FrontendEvaluationTrack | null) {
    if (gettingFeedback) return;

    gettingFeedback = true;
    
    webcamRecorder?.stop();
    let videoURL: undefined | string = undefined;
    if (webcamRecordedObjectURL) {
        videoURL = await webcamRecordedObjectURL;
    }

    const attemptHistory = $lastNAttemptsAngleSimilarity.map((a) => {
        return {
            score: a.summary?.overall ?? NaN, 
            date: a.date,
            segmentId: a.segmentId
        }
    });


    let feedback: TerminalFeedback | undefined = undefined;

    if (!terminalFeedbackEnabled || !performanceSummary) {
        feedback = generateFeedbackNoPerformance(
            dance.clipRelativeStem,
            $frontendPerformanceHistory,
            practiceStep?.danceTreeNode?.id ?? '',
        );
    }

    if ($useAIFeedback && !feedback) {
        try {
            const perfHistory = $frontendPerformanceHistory;
            const dancePerfHistory = practiceStep?.dance?.clipRelativeStem ? perfHistory?.[practiceStep.dance.clipRelativeStem] ?? null : null;
            feedback = await generateFeedbackWithClaudeLLM(
                practiceStep?.danceTree,
                practiceStep?.danceTreeNode?.id ?? 'undefined',
                performanceSummary ?? undefined,
                dancePerfHistory ?? undefined,
                $summaryFeedback_skeleton3d_mediumPerformanceThreshold,
                $summaryFeedback_skeleton3d_goodPerformanceThreshold,
                $metric__3dskeletonsimilarity__badJointStdDeviationThreshold,
                attemptHistory,
            )
        } catch(e) {
            console.warn("Error generating feedback with AI - falling back to rule-based feedback", e);
        }
    }

    if (!feedback) {
        const qijiaOverallScore = performanceSummary?.wholePerformance.qijia2DSkeletonSimilarity.overallScore ?? 0;
        const qijiaByVectorScores = performanceSummary?.wholePerformance.qijia2DSkeletonSimilarity.vectorByVectorScore ?? {} as Record<string, number>;

        const perfHistory = $frontendPerformanceHistory;
        const dancePerfHistory = practiceStep?.dance?.clipRelativeStem ? perfHistory?.[practiceStep.dance.clipRelativeStem] ?? null : null;
        feedback = generateFeedbackRuleBased(
            qijiaOverallScore, 
            qijiaByVectorScores,
            dancePerfHistory ?? undefined,
            practiceStep?.danceTreeNode?.id,
        );
    }
    
    feedback.debug = {
        ...feedback.debug,
        performanceSummary: performanceSummary ?? undefined,
        recordedTrack: recordedTrack ?? undefined,
    }

    if (videoURL) {
        let playbackSpeed = practiceStep?.playbackSpeed;
        if (playbackSpeed === undefined) {
            playbackSpeed = $practiceActivities__playbackSpeed;
        }
        feedback.videoRecording = {
            url: videoURL,
            mimeType: webcamRecorderMimeType,
            referenceVideoUrl: danceSrc,
            recordingStartOffset: practiceStep?.startTime ?? 0,
            recordingSpeed: playbackSpeed,
        };
    }

    feedback.segmentName = practiceStep?.danceTreeNode?.id;

    gettingFeedback = false;

    if ($debugMode && $debugMode__addPlaceholderAchievement) {
        feedback.achievements?.push("placeholder achievement");
    }

    return feedback;
}

let gettingFeedback = false;
// Auto-pause the video when the practice activity is over
$: {
    if ((practiceStep?.endTime && videoCurrentTime >= currentPlaybackEndtime) || 
        (videoDuration > 0 && videoCurrentTime >= videoDuration)) {
        isVideoPausedBinding = true;

        if (currentPlaybackEndtime === practiceStep?.endTime) {
            console.log('Paused video - reached end of practice activity');
            terminalFeedback = null;
            performanceSummary = null;
            let recordedTrack = null as null | FrontendEvaluationTrack;
            
            let subsequences = Object.fromEntries(
                containingDanceTreeLeafNodes.map((node) => 
                    [node.id, { startTime: node.start_time, endTime: node.end_time }]
                )
            );

            if (trialId) {
                performanceSummary = evaluator?.generatePerformanceSummary(trialId, subsequences) ?? null;
                recordedTrack = performanceSummary?.adjustedTrack ?? null;
            }
            trialId = null;
            state = "feedback";
            if (metronomeTimer) {
                clearTimeout(metronomeTimer)
            }
            getFeedback(performanceSummary, recordedTrack)
                .then(feedback => {
                    terminalFeedback = feedback ?? null;
                });
        }
        else {
            state = "paused"
            if (unpauseVideoTimeout === null) {
                unpauseVideoTimeout = window.setTimeout(unPauseVideo, 1000 * $debugPauseDurationSecs);
            }
        }
    }
}

async function playClickSound(silent: boolean = false) {
    clickAudioElement.currentTime = 0;
    clickAudioElement.volume = silent ? 0 : 1;
    return clickAudioElement.play();
}

let metronomePlaying = false;
let metronomeTimer: number | null = null;
async function launchMetronome() {
    if (!browser) return;
    if (metronomePlaying) return;
    metronomePlaying = true;
    let beatCount = 0;
    while (state !== "feedback" && isMounted) {
        playClickSound();
        
        await new Promise<void>((res) => {
            metronomeTimer = window.setTimeout(() => {
                res();
            }, 1000 * beatDuration);
        })
    }
    metronomePlaying = false;
    metronomeTimer = null;
}

async function startCountdown() {
    if (countdownActive) return;

    state = "countdown";
    countdownActive = true;

    // Safari / webkit disallows media elements from auto-playing without user interaction. We
    // want to be able to control the playback of the video element programatically, which safari
    // will only allow once the user has triggered playback through a user interaction. So, we try 
    // starting playback at the beginning of the countdown. If the 
    playClickSound(true);
    videoVolume = 0.01;
    videoPlaybackSpeed = 0.0625;// Minimum playback rate: https://stackoverflow.com/questions/30970920/html5-video-what-is-the-maximum-playback-rate
    let testPlaybackSuccessful = true;
    try {
        await playClickSound(true);
        await videoWithSkeleton.play();
    }
    catch(e) {
        testPlaybackSuccessful = false
        console.warn('startCountdown: test playback unsuccessful. Will try again after user interaction.', e);
    }

    isVideoPausedBinding = true;
    videoCurrentTime = practiceStep?.startTime ?? 0;
    videoVolume = $danceVideoVolume;
    videoPlaybackSpeed = $practiceActivities__playbackSpeed;
    if (practiceStep?.playbackSpeed !== undefined &&
        !isNaN(practiceStep.playbackSpeed)) {
        videoPlaybackSpeed = practiceStep.playbackSpeed;
    }

    if (!testPlaybackSuccessful) {
        state = 'waitStartUserInteraction';
        showStartCountdownDialog = true;
        countdownActive = false;
        return;
    }

    clickAudioElement.volume = 1;
    await tick();
    await waitSecs(beatDuration);

    state = "countdown";
    countdownActive = true;
    await waitSecs(beatDuration);

    countdown = 5;
    playClickSound();
    await waitSecs(beatDuration);
    if (!isMounted) return

    countdown = 6;
    playClickSound();
    await waitSecs(beatDuration);
    if (!isMounted) return

    countdown = 7;
    playClickSound();
    await waitSecs(beatDuration);
    if (!isMounted) return

    countdown = 8;
    playClickSound();
    await waitSecs(beatDuration);
    if (!isMounted) return

    trialId = generateUUIDv4();
    state = "playing";
    
    countdown = -1;

    resolveWebcamRecordedObjectUrl = null;
    rejectWebcamRecordedObjectUrl = null;
    webcamRecordedObjectURL = null;
    webcamRecorder?.stop();
    webcamRecorder = null;
    webcamRecordedChunks = [];

    if ($practiceActivities__enablePerformanceRecording && $webcamStream) {
        webcamRecordedObjectURL = new Promise((resolve, reject) => {
            resolveWebcamRecordedObjectUrl = resolve;
            rejectWebcamRecordedObjectUrl = reject;
        });

        if (MediaRecorder.isTypeSupported('video/webm')) {
            webcamRecorderMimeType = 'video/webm';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            webcamRecorderMimeType = 'video/mp4';
        }
        webcamRecorder = new MediaRecorder($webcamStream, { mimeType: webcamRecorderMimeType });
        webcamRecordedChunks = [];
        webcamRecorder.addEventListener('dataavailable', (e) => {
            webcamRecordedChunks.push(e.data);
        });
        webcamRecorder.addEventListener('stop', () => {
            let recordedVideoURL = URL.createObjectURL(new Blob(webcamRecordedChunks, {type: webcamRecorderMimeType}));
            resolveWebcamRecordedObjectUrl?.(recordedVideoURL);
        });
        webcamRecorder.start();
    }

    isVideoPausedBinding = false;
    countdownActive = false;
}

export async function reset() {
    console.log('Reseting practice page');
    if (unpauseVideoTimeout !== null) {
        clearTimeout(unpauseVideoTimeout);
    }
    if (!practiceStep) {
        console.warn('Null practice activity during reset() call');
    }

    if(!virtualMirrorElement) {
        await tick();
    }
    if (metronomeTimer) {
        clearTimeout(metronomeTimer)
    }

    terminalFeedback = null;
    trialId = null;
    currentActivityStepIndex = 0;
    state = "waitWebcam";
    lastEvaluationResult = null;
    isVideoPausedBinding = true;
    videoCurrentTime = practiceStep?.startTime ?? 0;
    const playDuration = (practiceStep?.endTime ?? videoDuration) - (videoCurrentTime)
    currentPlaybackEndtime = $pauseInPracticePage ? videoCurrentTime + playDuration / 2 : practiceStep?.endTime ?? videoDuration;
    


    // Start doing these 3d tasks in parallel, wait for them
    // all to complete betore continuing.
    const promises = [] as Promise<any>[];
    if (virtualMirrorElement && hasUserWebcamVisible) {
        promises.push(virtualMirrorElement.webcamStartedPromise);
    }
    let ref2dPosesPromise: ReturnType<typeof load2DPoseInformation> | null = null;
    let ref3dPosesPromise: ReturnType<typeof load3DPoseInformation> | null = null;
    if (!referenceDancePoses2D) {
        ref2dPosesPromise = load2DPoseInformation(supabase, dance);
        promises.push(ref2dPosesPromise);
    }  
    if (!referenceDancePoses3D) {
        ref3dPosesPromise = load3DPoseInformation(supabase, dance);
        promises.push(ref3dPosesPromise);
    }
    if (ref2dPosesPromise) { referenceDancePoses2D = await ref2dPosesPromise; }
    if (ref3dPosesPromise) { referenceDancePoses3D = await ref3dPosesPromise; }
    await Promise.all(promises);

    state = "waitStart";

    evaluator = getFrontendDanceEvaluator(
        referenceDancePoses2D!,
        referenceDancePoses3D!
    );

    isVideoPausedBinding = true;
    videoCurrentTime = practiceStep?.startTime ?? 0;

    await tick();

    if (poseEstimationEnabled) {
        console.log("Triggering pose estimation priming");
        await virtualMirrorElement.primePoseEstimation();
    }

    await waitSecs(beatDuration);

    // state = 'waitStartUserInteraction';
    // showStartCountdownDialog = true;
    startCountdown();
}


let poseEstimationCorrespondances: Map<number, {
    videoTimeSecs: number;
    actualTimeInMs: number;
    pageState: typeof state;
}> = new Map();
let lastPoseEstimationVideoTime: number = -1;
let lastPoseEstimationSentTimestamp: Date = new Date();
const maximumPoseEstimationFrequencyHz = 10;
const minimumPoseEsstimationIntervalMs = 1000 / maximumPoseEstimationFrequencyHz;

function poseEstimationFrameSent(e: any) {
    // Associate the webcam frame being sent for pose estimation
    // with the current video timestamp, so that we can later
    // compare the user's pose with the dance pose at that time.
    // console.log("poseEstimationFrameSent", e.detail.frameId, videoCurrentTime);
    poseEstimationCorrespondances.set(e.detail.frameId, {
        videoTimeSecs: videoCurrentTime,
        actualTimeInMs: Date.now(),
        pageState: state,
    });
    lastPoseEstimationVideoTime = videoCurrentTime;
}

/**
 * An override function used by the virtual mirror element to determine
 * whether or not to send the next frame to pose estimation. When pose estimation
 * is enabled (`poseEstimationEnabled`), VirtualMirror will call this function
 * just before sending the next frame to pose estimation. If this function returns
 * false, the frame will not be sent. This is useful for limiting the frequency
 * of pose estimation to save resources during situations when high pose estimation
 * frequency is unnecessary (such as during the countdown when the video is paused).
 */
function shouldSendNextPoseEstimationFrame() {

    // When the video is paused (such as during countdown), limit the fps 
    // of pose estimation to avoid wasting resources.
    if (
        lastPoseEstimationVideoTime === videoCurrentTime && 
        lastPoseEstimationSentTimestamp.getTime() > Date.now() - minimumPoseEsstimationIntervalMs
    ) {
        return false;
    }
    return true;
}

function poseEstimationFrameReceived(e: any) {
    // console.log("poseEstimationFrameReceived", e.detail.frameId, e.detail.result);

    if (!referenceDancePoses2D) {
        console.log("No dance pose information", e);
        return;
    };
    
    const frameId = e.detail.frameId
    if (!poseEstimationCorrespondances.has(frameId)) {
        console.log(`No matching correspondance for ${frameId}`, e, "current correspondances: ", poseEstimationCorrespondances)
        return;
    };
    const {
        videoTimeSecs,
        actualTimeInMs,
        pageState
    } = poseEstimationCorrespondances.get(frameId)!;

    poseEstimationCorrespondances.delete(frameId);

    const srcWidth = e?.detail?.srcWidth;
    const srcHeight = e?.detail?.srcHeight;
    const userNormalizedPose = (e?.detail?.estimated2DPose ?? null) as NormalizedLandmark[] | null;
    const user3DPose = (e?.detail?.estimated3DPose ?? null) as Pose3DLandmarkFrame | null;
    if (!userNormalizedPose || !user3DPose) { return; }

    // Flip normalized pose, since the user will be mirroring the dance
    let evaluation2DPose = GetPixelLandmarksFromNormalizedLandmarks(userNormalizedPose, srcWidth, srcHeight);
    let evaluation3DPose = user3DPose;MirrorXPose
    if (mirrorForEvaluation) {
        const userDanceFlippedNormalizedPose = MirrorXPose(userNormalizedPose);
        const userDanceFlippedPixelPose = GetPixelLandmarksFromNormalizedLandmarks(userDanceFlippedNormalizedPose, srcWidth, srcHeight);
        evaluation2DPose = userDanceFlippedPixelPose;
        evaluation3DPose = MirrorXPose(user3DPose);
    }
    if (!evaluation2DPose) { return; }
    try {
        lastEvaluationResult = evaluator?.evaluateFrame(
            trialId, 
            dance.clipRelativeStem,
            practiceStep?.segmentDescription ?? 'undefined',
            videoTimeSecs,
            actualTimeInMs,
            evaluation2DPose,
            evaluation3DPose,
            pageState !== 'playing' || trialId === null,
        ) ?? null;
    }
    catch (e) {
        lastEvaluationResult = null;
        console.warn('Error evaluating frame', e);
    }
}

let drawReferenceDanceSkeleton = false;
let toggleSkeletonInvervel: null | number = null;
//  window.setInterval(() => {
//     drawReferenceDanceSkeleton = !drawReferenceDanceSkeleton;
// }, 1000);

onMount(() => {
    // Prepare pose estimation, so that it'll be ready 
    // when we need it, as opposed to creating the model
    // after the video starts playing.
    clickAudioElement = new Audio(metronomeClickSoundSrc);
    videoCurrentTime = practiceStep?.startTime ?? 0;
    poseEstimationReady = virtualMirrorElement.setupPoseEstimation();
    reset();
    isMounted = true;

    return () => {
        if (metronomeTimer) {
            clearTimeout(metronomeTimer);
        }
        if (unpauseVideoTimeout) {
            clearTimeout(unpauseVideoTimeout);
        }
        if (toggleSkeletonInvervel) {
            clearInterval(toggleSkeletonInvervel);
        }
        if (webcamRecorder) {
            webcamRecorder.stop();
            webcamRecorder = null;
        }
        isMounted = false;
    }
})

</script>

<section class="practicePage" 
    class:hasDanceTree={practiceStep?.danceTree}
    class:hasFeedback={isShowingFeedback}
    class:isPracticing={!isShowingFeedback}
    class:hasOnlyDemoVideo={hasVisibleReferenceVideo && !hasUserWebcamVisible}
    class:hasOnlyUserMirror={hasUserWebcamVisible && !hasVisibleReferenceVideo}
    >
    {#if practiceStep?.danceTree}
    <div class="treevis gridItem">
        <DanceTreeVisual 
            node={practiceStep.danceTree.root }
            showProgressNode={isShowingFeedback ? undefined : practiceStep.danceTreeNode} 
            currentTime={videoCurrentTime}
            danceTree={practiceStep.danceTree}
            nodeHighlights={nodeHighlights}
            enableClick={isShowingFeedback}
            enableColorCoding={ isShowingFeedback ? true : 'yesExceptCurrentNode'}
            on:nodeClicked={(e) => onNodeClicked(e.detail)}
            playingFocusMode={isShowingFeedback ?  
                'show-all':
                'hide-others'
            }/>
    </div>
    {/if}


    <div class="demovid gridItem" style:display={!hasVisibleReferenceVideo ? 'none' : 'flex'}>
        <VideoWithSkeleton
            bind:this={videoWithSkeleton}
            bind:currentTime={videoCurrentTime}
            bind:playbackRate={videoPlaybackSpeed}
            bind:paused={isVideoPausedBinding}
            bind:duration={videoDuration}
            flipHorizontal={flipVideo}
            fitToFlexbox={fitVideoToFlexbox}
            poseData={referenceDancePoses2D}
            drawSkeleton={drawReferenceDanceSkeleton}
            volume={videoVolume}
        >
            <source src={danceSrc} type="video/mp4" />
        </VideoWithSkeleton>
        {#if state === 'waitStartUserInteraction' && !showStartCountdownDialog}
        <div class="startCountdown">
            <button class="button thick" on:click={() => startCountdown()}>
                Start Countdown
            </button>
        </div>
        {/if}
        <div class="absolute left-0 right-0 bottom-0">
            <p>state: {state}</p>
            <p>showStartCountdownDialog: {showStartCountdownDialog}</p>
        </div>
    </div>
    <div 
        class="mirror gridItem"
        class:hidden={!hasUserWebcamVisible}
        >
        <VirtualMirror
            bind:this={virtualMirrorElement}
            {poseEstimationEnabled}
            drawSkeleton={false}
            poseEstimationCheckFunction={shouldSendNextPoseEstimationFrame}
            customDrawFn={(ctx, pose) => {
                if (!skeletonDrawingEnabled) return;
                
                const evalResToPass = skeletonDrawingEnabled ? lastEvaluationResult : null;
                Draw2dSkeleton(ctx, pose, evalResToPass, mirrorForEvaluation);
            }}
            on:poseEstimationFrameSent={poseEstimationFrameSent}
            on:poseEstimationResult={poseEstimationFrameReceived}
        />
        {#if state === "waitStart"}  
        <div class="loading outlined thick">
            <!-- <div class="spinner large"></div> -->
            <div class="label">Loading<ProgressEllipses /></div>
        </div>
        {/if}
    </div>

    <Dialog open={isShowingFeedback} modal={false}>
        <span slot="title">Feedback</span>
        <div class="feedback">
            <TerminalFeedbackScreen 
                feedback={terminalFeedback}
                showActivityConfiguratorButton={true}
                on:repeat-clicked={() => onNodeClickedById(practiceStep?.danceTreeNode?.id ?? '')}
                on:continue-clicked={() => dispatch('continue-clicked')}
                on:practice-action-clicked={(e) => onNodeClickedById(e.detail)}
                on:configure-activity-clicked={() => isShowingNextActivityConfigurator = !isShowingNextActivityConfigurator}
            />
            <!-- <pre>{JSON.stringify(performanceSummary, replaceJSONForStringifyDisplay, 2)}</pre> -->
        </div>
    </Dialog>
    <Dialog open={isShowingFeedback && isShowingNextActivityConfigurator}
        on:dialog-closed={() => isShowingNextActivityConfigurator = false}>
        <span slot="title">Practice Setup</span>
        <PracticeActivityConfigurator 
                persistInSettings={true}
                bind:practiceActivityParams={nextPracticeActivityParams}
            />
    </Dialog>

    {#if countdown >= 0}
    <div class="absolute inset-0 flex justify-center items-center">
        <div class="bg-primary rounded-box p-4 text-primary-content">
            <span class="text-6xl">
                {countdown}
            </span>
        </div>
    </div>
    {/if}

    <Dialog 
        open={state === 'waitStartUserInteraction' && showStartCountdownDialog}
        on:dialog-closed={() => showStartCountdownDialog = false}
    >
        <span slot="title">Click to Start</span>
        <p class="limit-line-width">We couldn't play the video automatically. Please click or tap the button on the button below to start the countdown.</p>
        <button class="button" on:click={() => startCountdown()}>
            Start Countdown
        </button>
    </Dialog>
</section>

<style lang="scss">

div.demovid { grid-area: demovid; }
div.mirror {  grid-area: mirror;  }
div.treevis { grid-area: treevis; }

div.feedback { grid-area: feedback; overflow: hidden;}

section {
    overflow: hidden;
    display: grid;
    grid-template: "demovid mirror" 1fr / 1fr 1fr;
    &.hasOnlyDemoVideo {
        grid-template: "demovid" 1fr / 1fr;
    }
    &.hasOnlyUserMirror {
        grid-template: "mirror" 1fr / 1fr;
    }

    &.hasDanceTree {
        grid-template-areas:
            "treevis treevis"
            "demovid  mirror";
        grid-template-rows: auto 1fr;
        grid-template-columns: 1fr 1fr;
        // grid-template:
        //     "treevis treevis" auto
        //     "demovid mirror" 1fr / 1fr 1fr;

        &.hasOnlyDemoVideo {
            grid-template-areas:
                "treevis treevis"
                "demovid  demovid";
        }
        &.hasOnlyUserMirror {
            grid-template-areas:
                "treevis treevis"
                "mirror  mirror";
        }
    }
    // &.hasFeedback {
    //     grid-template: "feedback feedback" 1fr / 1fr 1fr;
    // }
    // &.hasDanceTree.hasFeedback {
    //     grid-template:
    //         "treevis treevis" auto
    //         "feedback feedback" 1fr / 1fr 1fr;
    // }
    
    align-items: center;
    justify-content: stretch;
    
    box-sizing: border-box;
    height: 100%;
    width: 100%;
    gap: 1rem;

    & > .gridItem {
        place-self: center;
        position: relative;
        flex-grow: 1;
        flex-shrink: 1;
        flex-basis: 1rem;
        width: 100%;
        height: 100%;
        border-radius: 0.5em;
        display: flex;
        align-items: stretch;
        justify-content: stretch;
        flex-direction: column;
    }
}

.startCountdown {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
    // background-color: rgba(0, 0, 0, 0.2);

    & .button {
        padding: 1em;
    }
}

.countdown {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

.count {
    width: 4rem;
    height: 4rem;
    text-align: center;
    font-size: 4rem;
    font-weight: bold;
    color: white;
    background-color: rgba(0, 0, 0, 0.2);
    //  add background blur
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);

    padding: 3rem;
    border-radius: 50%;
}

.loading {
    // position the spinner in the center of the screen
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    padding: 2rem;
    background-color: #fff;

    & .label {
        margin-top: 1em;
    }
}

.hidden {
    position: absolute !important; 
    left: 9999vw !important;
}

</style>
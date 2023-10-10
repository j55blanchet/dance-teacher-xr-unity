import { writable } from 'svelte/store';

const DEFAULT_SETTINGS = {
   debugMode: false,
   pauseInPracticePage : false,
   practiceFallbackPlaybackSpeed: 0.5,
   debugPauseDurationSecs : 1.0,
   evaluation_GoodBadTrialThreshold : 4.0,
   livefeedback_qijia2d_YellowThreshold : 3.0,
   livefeedback_qijia2d_GreenThreshold : 4.2,
   useAIFeedback: true,
   useTextToSpeech: true,
   summaryFeedback_skeleton3d_mediumPerformanceThreshold: 0.8,
   summaryFeedback_skeleton3d_goodPerformanceThreshold: 0.9,
   evaluation_summarizeSubsections: 'allnodes' as const,
   
}

export const pauseDurationMin = 0.1;
export const pauseDurationMax = 120;
export const stepMin = 0.1;
export const stepMax = 5;

function createSettingsStore<T>(key: string, defaultValue: T, stringParser: (input: string) => T) {
    const initialValue = localStorage[key] === undefined ? defaultValue : stringParser(localStorage[key]);
    const settingsStore = writable(initialValue);
    settingsStore.subscribe((value) => localStorage[key] = String(value));
    return settingsStore;
}

function createBoolSettingsStore(key: string, defaultValue: boolean) {
    return createSettingsStore(key, defaultValue, (input: string) => input === 'true');
}
function createNumberSettingsStore(key: string, defaultValue: number) {
    return createSettingsStore(key, defaultValue, Number.parseFloat);
}
function createOptionsSettingsStore<T extends Record<string, string>>(key: string, defaultValue: keyof T, options: Readonly<T>) {
    return createSettingsStore(key, defaultValue, (input: string) => {
        const optionsKeys = Object.keys(options);
        if (!optionsKeys.includes(input)){
            console.warn(`Ignoring invalid stored value for ${key}: ${input}`);
            return defaultValue;
        }
        return input as keyof T;
    });
}

export const debugMode = createBoolSettingsStore("debugMode", DEFAULT_SETTINGS.debugMode);
export const pauseInPracticePage = createBoolSettingsStore("pauseInPracticePage", DEFAULT_SETTINGS.pauseInPracticePage);
export const debugPauseDurationSecs = createNumberSettingsStore("debugPauseDurationSecs", DEFAULT_SETTINGS.debugPauseDurationSecs);
export const practiceFallbackPlaybackSpeed = createNumberSettingsStore("practiceFallbackPlaybackSpeed", DEFAULT_SETTINGS.practiceFallbackPlaybackSpeed);
export const evaluation_GoodBadTrialThreshold = createNumberSettingsStore("evaluation_GoodBadTrialThreshold", DEFAULT_SETTINGS.evaluation_GoodBadTrialThreshold);
export const feedback_YellowThreshold = createNumberSettingsStore("feedback_YellowThreshold", DEFAULT_SETTINGS.livefeedback_qijia2d_YellowThreshold);
export const feedback_GreenThreshold = createNumberSettingsStore("feedback_GreenThreshold", DEFAULT_SETTINGS.livefeedback_qijia2d_GreenThreshold);
export const useAIFeedback = createBoolSettingsStore("useAIFeedback", DEFAULT_SETTINGS.useAIFeedback);
export const useTextToSpeech = createBoolSettingsStore("useTextToSpeech", DEFAULT_SETTINGS.useTextToSpeech);
export const evaluation_summarizeSubsectionsOptions = {
    // storedValue: displayName
    'disable': "Don't evaluate subsections",
    'leafnodes': 'Evaluate leaf nodes only',
    'allnodes': 'Evaluate all subsections'
 };
export const evaluation_summarizeSubsections = createOptionsSettingsStore(
    "evaluation_analyzeSubsections", DEFAULT_SETTINGS.evaluation_summarizeSubsections, evaluation_summarizeSubsectionsOptions
);
export const summaryFeedback_skeleton3d_mediumPerformanceThreshold = createNumberSettingsStore("summaryFeedback_skeleton3d_mediumPerformanceThreshold", DEFAULT_SETTINGS.summaryFeedback_skeleton3d_mediumPerformanceThreshold);
export const summaryFeedback_skeleton3d_goodPerformanceThreshold = createNumberSettingsStore("summaryFeedback_skeleton3d_goodPerformanceThreshold", DEFAULT_SETTINGS.summaryFeedback_skeleton3d_goodPerformanceThreshold);
    

// Reset all variables to their default values
export function resetSettingsToDefault() {
    debugMode.set(DEFAULT_SETTINGS.debugMode);
    pauseInPracticePage.set(DEFAULT_SETTINGS.pauseInPracticePage);
    debugPauseDurationSecs.set(DEFAULT_SETTINGS.debugPauseDurationSecs);
    practiceFallbackPlaybackSpeed.set(DEFAULT_SETTINGS.practiceFallbackPlaybackSpeed);
    evaluation_GoodBadTrialThreshold.set(DEFAULT_SETTINGS.evaluation_GoodBadTrialThreshold);
    feedback_YellowThreshold.set(DEFAULT_SETTINGS.livefeedback_qijia2d_YellowThreshold);
    feedback_GreenThreshold.set(DEFAULT_SETTINGS.livefeedback_qijia2d_GreenThreshold);
    useAIFeedback.set(DEFAULT_SETTINGS.useAIFeedback);
    useTextToSpeech.set(DEFAULT_SETTINGS.useTextToSpeech);
    summaryFeedback_skeleton3d_mediumPerformanceThreshold.set(DEFAULT_SETTINGS.summaryFeedback_skeleton3d_mediumPerformanceThreshold);
    summaryFeedback_skeleton3d_goodPerformanceThreshold.set(DEFAULT_SETTINGS.summaryFeedback_skeleton3d_goodPerformanceThreshold);
    evaluation_summarizeSubsections.set(DEFAULT_SETTINGS.evaluation_summarizeSubsections)
}
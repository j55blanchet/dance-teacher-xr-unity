import { dev } from '$app/environment';
import { writable } from 'svelte/store';

const DEFAULT_SETTINGS = Object.freeze({
   debugMode: false,
   pauseInPracticePage : false,
   debugPauseDurationSecs : 1.0,
   evaluation_GoodBadTrialThreshold : 4.0,
   feedback_YellowThreshold : 3.0,
   feedback_GreenThreshold : 4.2
})

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

export const debugMode = createBoolSettingsStore("debugMode", DEFAULT_SETTINGS.debugMode);
export const pauseInPracticePage = createBoolSettingsStore("pauseInPracticePage", DEFAULT_SETTINGS.pauseInPracticePage);
export const debugPauseDurationSecs = createNumberSettingsStore("debugPauseDurationSecs", DEFAULT_SETTINGS.debugPauseDurationSecs);
export const evaluation_GoodBadTrialThreshold = createNumberSettingsStore("evaluation_GoodBadTrialThreshold", DEFAULT_SETTINGS.evaluation_GoodBadTrialThreshold);
export const feedback_YellowThreshold = createNumberSettingsStore("feedback_YellowThreshold", DEFAULT_SETTINGS.feedback_YellowThreshold);
export const feedback_GreenThreshold = createNumberSettingsStore("feedback_GreenThreshold", DEFAULT_SETTINGS.feedback_GreenThreshold);

// Reset all variables to their default values
export function resetSettingsToDefault() {
    debugMode.set(DEFAULT_SETTINGS.debugMode);
    pauseInPracticePage.set(DEFAULT_SETTINGS.pauseInPracticePage);
    debugPauseDurationSecs.set(DEFAULT_SETTINGS.debugPauseDurationSecs);
    evaluation_GoodBadTrialThreshold.set(DEFAULT_SETTINGS.evaluation_GoodBadTrialThreshold);
    feedback_YellowThreshold.set(DEFAULT_SETTINGS.feedback_YellowThreshold);
    feedback_GreenThreshold.set(DEFAULT_SETTINGS.feedback_GreenThreshold);
}
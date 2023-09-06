import { dev } from '$app/environment';
import { writable } from 'svelte/store';

export const debugMode = writable(localStorage.debugMode === 'true');

export const pauseInPracticePage = writable(localStorage.pauseInPracticePage === 'true');

export const debugPauseDurationSecs = writable( parseFloat(localStorage.debugPauseDurationSecs) || 1.0);

export const evaluation_GoodBadTrialThreshold = writable(parseFloat(localStorage.evaluation_GoodBadTrialThreshold) || 4.0);

export const feedback_YellowThreshold = writable(parseFloat(localStorage.feedback_YellowThreshold) || 3.0);

export const feedback_GreenThreshold = writable(parseFloat(localStorage.feedback_GreenThreshold) || 4.2);

debugMode.subscribe((value) => localStorage.debugMode = String(value));

pauseInPracticePage.subscribe((value) => localStorage.pauseInPracticePage = String(value));

debugPauseDurationSecs.subscribe((value) => localStorage.debugPauseDurationSecs = String(value));

evaluation_GoodBadTrialThreshold.subscribe((value) => localStorage.evaluation_GoodBadTrialThreshold = String(value));

feedback_YellowThreshold.subscribe((value) => localStorage.feedback_YellowThreshold = String(value));

feedback_GreenThreshold.subscribe((value) => localStorage.feedback_GreenThreshold = String(value));

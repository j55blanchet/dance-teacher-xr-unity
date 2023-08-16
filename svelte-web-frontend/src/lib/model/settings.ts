import { dev } from '$app/environment';
import { writable } from 'svelte/store';

export const debugMode = writable(dev);

export const pauseInPracticePage = writable(false);

export const debugPauseDurationSecs = writable(1.0);

export const evaluation_GoodBadTrialThreshold = writable(4.0);

export const feedback_YellowThreshold = writable(3.0);

export const feedback_GreenThreshold = writable(4.2);
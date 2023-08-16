import { dev } from '$app/environment';
import { writable } from 'svelte/store';

export const debugMode = writable(dev);

export const pauseInPracticePage = writable(false);

export const debugPauseDurationSecs = writable(1.0);
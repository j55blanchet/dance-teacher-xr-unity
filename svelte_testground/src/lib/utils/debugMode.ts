import { dev } from '$app/environment';
import { writable } from 'svelte/store';

export const debugMode = writable(dev);

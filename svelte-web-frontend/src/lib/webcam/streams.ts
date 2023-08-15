
import { readable, writable, derived } from 'svelte/store';

export const webcamStream = writable(null as null | MediaStream);
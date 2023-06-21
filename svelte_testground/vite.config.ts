import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	base: '/dance-teacher-xr-unity/',
	plugins: [sveltekit()],
	worker: {
		// format: 'es',
	}
});

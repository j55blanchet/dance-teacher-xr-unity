import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	worker: {
		// format: 'es',
	},
	test: {
		coverage: {
			reportsDirectory: './testResults/coverage',
			reporter: ['lcov', 'text'],
		}
	}
});

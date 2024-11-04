module.exports = {
	root: true,
	extends: [
		'eslint:recommended', 
		'plugin:@typescript-eslint/recommended', 
		'prettier',
		'plugin:svelte/prettier',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: 'tsconfig.json',
		extraFileExtensions: ['.svelte'] // This is a required setting in `@typescript-eslint/parser` v4.24.0.
	},
	plugins: ['@typescript-eslint'],
	ignorePatterns: ['*.cjs'],
	overrides: [{ 
		files: ['*.svelte'], 
		parser: 'svelte-eslint-parser',
		// Parse the `<script>` in `.svelte` as TypeScript
		parserOptions: {
			parser: '@typescript-eslint/parser',
		} 
	}],
	settings: {
		// 'svelte3/typescript': () => require('typescript')
	},
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	},
	rules: {
		'@typescript-eslint/no-explicit-any': 0, // allow explicit any
		'@typescript-eslint/no-unused-vars': [2, { argsIgnorePattern: '^_' }], // allow unused vars that start with `_`
		// svelte a11y can be disabled in .vscode/settings.json
	}
};

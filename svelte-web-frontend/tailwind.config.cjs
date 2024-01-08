/** @type {import('tailwindcss').Config}*/
const config = {
	content: ['./src/**/*.{html,js,svelte,ts}', './src/app.html'],

	theme: {
		extend: {}
	},

	plugins: [require('daisyui')],

	daisyui: {
		prefix: 'daisy-',
	}
};

module.exports = config;

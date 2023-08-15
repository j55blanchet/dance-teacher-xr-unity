# Svelte Web Frontend

This is a web app for teaching short dance choreographies, built using the svelte framework.

## Developing

For all development on the frontend, we assume you're in this directory. `cd` into it if you're not.

I recommend using Visual Studio Code as your editor, with the [svelte extension](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) installed.

1. Install [Node.js](https://nodejs.org)
2. (recommended) install [pnpm](https://pnpm.js.org/en/installation)

```bash
npm install -g pnpm
```

3. Ensure that the motion processing pipeline has been run, so that the `static/bundle` directory and `src/lib/data/bundle` folders are populated with the necessary files. See the [motion pipeline README](../motion-pipeline/README.md) for more information.

4. Install the dependencies:

```bash
pnpm install
```

5. Run the app:

```bash
pnpm run dev
```

6. Navigate to [localhost:5173](http://localhost:5173)

## Building

To create a production version of the app:

```bash
npm run build
```

This will leave a production-ready version of the app in the `../docs` folder, which github pages will pick up when you merged into the `main` branch.

You can preview the production build with:

```bash
npm run preview
```
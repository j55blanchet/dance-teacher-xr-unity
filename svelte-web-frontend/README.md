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

## Testing

We use `vitest` for testing. This will be installed as a dev dependency as part of `pnpm install`.

I recommend using Visual Studio Code as your editor, with the [vitest extension](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer) installed.

* Then, you can use the testing tab in vscode to run tests, or hover over tests and click to run or debug an individual test.

You can also run tests from the command line:

* To run tests, you can simply do `pnpm run test`. This will put tests in watch mode, and will rerun whenever code changes.
* You can also execute `pnpm run test --run` to run the tests only once (not in watch mode).
* You can also execute `pnpm run test --coverage` to run the tests and generate a coverage report.

Many motion metric tests include a test that runs the metric against multiple pre-recorded dance performance and outputs the formatted summaries of the results in the `testResults` directory. These CSV files are very useful for getting an overview of a given metric's output for many different performances. You can record a new performance by loading up the site, enabling debug mode, and practicing a segment. Then, click "Export Recorded Track", enter a description for the track, and the files will be saved.

## Development Tips

### Using Icons

We use the [unplugin-icons](https://github.com/unplugin/unplugin-icons) package. For consistency, we prefer to use icons form the `IconPark Outline` library, searchable [here](https://icon-sets.iconify.design/icon-park-outline/).

To put an icon in your code, first import it like so:

```js
import ClockIcon from 'virtual:icons/icon-park-outline/alarm-clock';
```

Then use it like so:

```html
<ClockIcon />
```

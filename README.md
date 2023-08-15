# Dance Teacher XR

## About
This repo houses work for the 2nd iteration of a system for teaching short dance choreographies from video. 

The first iteration of the system is presented and described in this demo paper: [Automatic Generation and Teaching of Dance Lessons from Video (HotMobile '23)](https://dl.acm.org/doi/abs/10.1145/3572864.3581592). The extended jounrnal version of this paper is currently in progress.

There are two main components to this system:  
* An offline motion-processing module, under the folder `motion-pipeline`. This python module performs computationally intensive processing tasks offline, such as pose estimation, music analysis, and compexity calculation, and bundles the final output files for the consumption of the web frontend. It also performs retargeting of motions for robot demonstration. 
* A javascript webapp for teaching dance lessons, written using the [Svelte](https://svelte.dev/) framework, under the folder `svelte-web-frontend`. This we

## Getting Started

1. Install git, and install [git large file storage](https://git-lfs.com/) with `git lfs install`
2. Follow the README.md for the [Motion Processing Pipeline](motion-pipeline/README.md) module to setup the python environment, install dependencies, and run the pipeline. This will generate a data bundle for the web frontend.
3. Follow the README.md for the [Svelte Web Frontend](svelte-web-frontend/README.md) to setup the svelte environment and run the webapp. You can then access the webapp on localhost (see the README.md for details).

## Updating the Published Webapp
The webapp is published on github pages. The published webapp is hosted from the `docs` folder. Running a svelte build job in the web frontend folder will update the published verison in the docs folder. When pushed to the main branch, the published webapp will be updated. The webapp is available at <https://dancetutor.julien.studio>.

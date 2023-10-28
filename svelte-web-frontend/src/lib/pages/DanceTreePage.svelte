<script lang="ts">
import { goto } from '$app/navigation';
import { page, navigating } from '$app/stores'
import { navbarProps } from '$lib/elements/NavBar.svelte';

import SketchButton from '$lib/elements/SketchButton.svelte';
import { getDanceVideoSrc, type Dance, type DanceTree, type DanceTreeNode } from '$lib/data/dances-store';
import type { NodeHighlight } from '$lib/elements/DanceTreeVisual.svelte';
import DanceTreeVisual from '$lib/elements/DanceTreeVisual.svelte';
import { tick } from 'svelte';

import VideoWithSkeleton from '$lib/elements/VideoWithSkeleton.svelte';
import { danceVideoVolume, debugMode, debugMode__viewBeatsOnDanceTreepage } from '$lib/model/settings';
import ProgressEllipses from '$lib/elements/ProgressEllipses.svelte';
import { GeneratePracticeActivity } from '$lib/ai/TeachingAgent';
import { PracticeActivityDefaultInterfaceSetting, PracticeInterfaceModes, type PracticeInterfaceModeKey } from '$lib/model/PracticeActivity';

export let dance: Dance;
export let danceTree: DanceTree;

// Pin the video small, so the flexbox system can auto-size the height
let fitVideoToFlexbox = true;

let danceSrc: string = '';
$: {
    danceSrc = getDanceVideoSrc(dance);
}
let danceBeatTimes: number[] = [];

$: danceBeatTimes = dance?.all_beat_times ?? [];
let videoPaused: boolean = true;
let stopTime: number = Infinity;
let videoCurrentTime: number = 0;
let currentPlayingNode: DanceTreeNode | null = null;

let videoPlaybackSpeed: number = 1;
let videoDuration: number;

let practiceActivityInterfaceMode: PracticeInterfaceModeKey = PracticeActivityDefaultInterfaceSetting;
const interfaceModeOptions: {
    title: string,
    value: PracticeInterfaceModeKey,
    iconUrl?: string,
}[] = [
    {
        title: 'Demo Video',
        value: 'watchDemo'
    },
    {
        title: 'Demo + Mirror',
        value: 'bothVideos',
    },
    {
        title: 'Mirror',
        value: 'userVideoOnly',
    },
]

$: if (videoCurrentTime > stopTime) {
    videoPaused = true;
}

$: {
    navbarProps.update(props => ({
        ...props,
        pageTitle: `${dance.title} (Preview)`,
        backPageUrl: '/',
        backPageTitle: 'Home',
    }));
}

async function onNodeClicked(e: any) {
    console.log('node clicked', e.detail);

    const selectedTreeNode = e.detail as DanceTreeNode;
    videoPaused = true;
    stopTime = selectedTreeNode.end_time;
    currentPlayingNode = selectedTreeNode;
    await tick();
    videoCurrentTime = selectedTreeNode.start_time;
    await tick();
    videoPaused = false;
    // videoElement.play();
}

function showProgress(node: DanceTreeNode) {
    return node === currentPlayingNode;
}

async function practiceClicked() {
    try {
        if (!currentPlayingNode) throw new Error('No node selected');
        
        const { activity, url} = GeneratePracticeActivity({
            dance: dance,
            danceTree: danceTree,
            danceTreeNode: currentPlayingNode,
            playbackSpeed: videoPlaybackSpeed,
            interfaceMode: practiceActivityInterfaceMode,
            terminalFeedbackEnabled: true,
            enableUserSkeletonColorCoding: true,
        });
        
        await goto(url);
    } 
    catch(e) {
        console.error("Error navigating to practice page", e);
    }
}

let nodeHighlights: Record<string, NodeHighlight> = {};
$: {
    if (currentPlayingNode) {
        nodeHighlights = {
            [currentPlayingNode.id]: {
                color: 'var(--color-theme-1)',
                label: currentPlayingNode.id,
            }
        };
    }
    else {
        nodeHighlights = {};
    }
}

</script>

<section class:nodeSelected={currentPlayingNode ?? false }>
    <div class="visual-tree">
        <div>
            <DanceTreeVisual 
                on:nodeClicked={onNodeClicked} 
                enableClick 
                node={danceTree.root}
                danceTree={danceTree}
                showProgressNode={currentPlayingNode ?? undefined}
                currentTime={videoCurrentTime}
                beatTimes={$debugMode && $debugMode__viewBeatsOnDanceTreepage ? danceBeatTimes : []}
                enableColorCoding={true}
                nodeHighlights={nodeHighlights}
            /> 
        </div>
    </div>
     
    <div class="preview-container cols">
        <div class="col ml-4 pb-4 vfill flex flex-col flex-crossaxis-center flex-mainaxis-stretch">
        
            <VideoWithSkeleton bind:currentTime={videoCurrentTime}
                bind:playbackRate={videoPlaybackSpeed}
                bind:duration={videoDuration}
                bind:paused={videoPaused}
                fitToFlexbox={false}
                drawSkeleton={false}
                volume={$danceVideoVolume}
                >
                <source src={danceSrc} type="video/mp4" />
            </VideoWithSkeleton>
        </div>
        <div class="col vfill flex flex-col flex-center controls">
                {#if currentPlayingNode}
                <h3>Playing '{currentPlayingNode.id}'</h3>
                <div class="control">
                    <label for="playbackSpeed">Speed:</label>
                    <input type="range" name="playbackSpeed" bind:value={videoPlaybackSpeed} min="0.4" max="1.3" step="0.1" />
                    {videoPlaybackSpeed.toFixed(1)}x
                </div>
                <div class="control interfaceMode" >
                    {#each interfaceModeOptions as interfaceModeOption}
                    <label class="button outlined thin" class:selected={interfaceModeOption.value === practiceActivityInterfaceMode }>
                        {interfaceModeOption.title}
                        <input type="radio" name="practiceActivityInterfaceMode" value={interfaceModeOption.value} bind:group={practiceActivityInterfaceMode}/>
                    </label>
                    {/each}
                </div>
                <div class="control mt-4">
                    <SketchButton on:click={practiceClicked} disabled={$navigating !== null}>
                        {#if $navigating}
                            Navigating<ProgressEllipses />
                        {:else}
                            Practice {currentPlayingNode.id} ➡️
                        {/if}
                    </SketchButton>
                </div>
            {:else}
                <h3>Click above to select a part of the song to practice</h3>
            {/if}
        </div>
    </div>
</section>


<style lang="scss">
section {
    position: relative;
    width: 100vw;
    height: var(--content_height);
    box-sizing: border-box;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr); 
    gap: 1rem;
}

.preview-container {
    position: relative;
}

.visual-tree {
    max-width: 100vw;
    margin: 1rem;
    margin-bottom: 0;
}
.visual-tree div {
    display: flex;
    overflow-x: auto;
}

// div:has(.practiceLink) {
    // margin-bottom: 1rem;
// }

.controls {
    gap: 0.5rem;
}

.control {
    display: flex;
    flex-direction: row; 
    align-items: center;
    justify-content: center;
    gap: 1ch;

    input[type="range"] {
        max-width: 10ch;
    }

    &.interfaceMode label {
        box-sizing: border-box;
        padding: 0.25em;
        width: 5em;
        height: 5em;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        // border-radius: var(--std-border-radius);
        box-shadow: 2px 2px 2px 2px rgba(0, 0, 0, 0.3);

        & input {
            position:absolute;
            left: -50%;
            opacity: 0;
            width: 0;
            height: 0;

        }

        &:has( > input:checked) {
            color: red;
        }

        &.selected {
            color: var(--color-theme-1);
            border-color: var(--color-theme-1);
            border-width: 3px;
            background: white;
        }
    }

    // &.interfaceMode label:has(input[selected=true])
}
</style>

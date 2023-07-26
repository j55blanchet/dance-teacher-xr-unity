<script lang="ts">
import VirtualMirror from "./VirtualMirror.svelte";

import type { Dance } from "./dances-store";
import { getDanceVideoSrc } from "./dances-store";

export let dance: Dance;
let videoElement: HTMLVideoElement;
let videoCurrentTime: number = 0;
let videoPlaybackSpeed: number = 1;
let danceSrc: string = '';

$: {
    danceSrc = getDanceVideoSrc(dance);
}

</script>


<section>
    <div>
        <video bind:this={videoElement}
               bind:currentTime={videoCurrentTime}
               bind:playbackRate={videoPlaybackSpeed}>
            <source src={danceSrc} type="video/mp4" />
        </video>
    </div>
    <div>
        <VirtualMirror />  
    </div>
</section>

<style lang="scss">

section {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: stretch;
    height: 100%;
    width: 100%;

    & > div {
        position: relative;
        flex-grow: 1;
        flex-shrink: 1;
        flex-basis: 1rem;
        max-width: 100%;
        max-height: 100%;
        border-radius: 0.5em;
        display: flex;

    }
}

</style>
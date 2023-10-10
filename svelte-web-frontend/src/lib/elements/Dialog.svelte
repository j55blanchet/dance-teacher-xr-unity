<script lang="ts">
import { createEventDispatcher } from "svelte";
import CloseButton from "./CloseButton.svelte";

const dispatcher = createEventDispatcher();

let dialogElement: HTMLDialogElement | undefined;
export let open = false;

$: {
    if (open) {
        dialogElement?.showModal();
    } else {
        dialogElement?.close();
    }
}
</script>

<dialog bind:this={dialogElement} class="outlined">
    <div class="topBar">
        <h3><slot name="title"></slot></h3>
        <div class="closeContainer">
            <CloseButton isVisible={open} on:click={() => dispatcher('dialog-closed') } />
        </div>
    </div>
    <div class="dialogcontent">
        <slot></slot>
    </div>
</dialog>


<style lang="scss">
dialog {
    max-height: calc(100vh - 2rem);
    max-width: calc(100vw - 2rem);
    box-sizing: border-box;
    font-size: 1rem;
    overflow-y: hidden;
}

dialog::backdrop {
    background: rgba(0, 0, 0, 0.2);
	backdrop-filter: blur(5px);
}

.topBar {
    display: flex;
    flex-direction: row;
    align-items: start;
    justify-content: space-between;
    gap: 1em;
    box-sizing: border-box;
    flex-grow: 0;
    flex-shrink: 0;
    margin-bottom: 0.5em;

    > h3 {
        align-self: flex-end;
        flex-grow: 1;
        flex-shrink: 1;
        margin: 0;
    }
}


.closeContainer {
    flex-grow: 0;
    flex-shrink: 0;
    font-size: 0.75em;
}

.dialogcontent {
    max-height: 80vh;
    overflow-y: scroll;
}
</style>
<script lang="ts">
import { createEventDispatcher } from "svelte";
import CloseButton from "./CloseButton.svelte";

const dispatcher = createEventDispatcher();

let dialogElement: HTMLDialogElement | undefined;
export let open = false;
export let modal = true;
export let showCloseButton = true;

$: {
    if (open) {
        if (modal) {
            dialogElement?.showModal();
        } else {
            dialogElement?.show();
        }
    } else {
        dialogElement?.close();
    }
}
</script>

<dialog bind:this={dialogElement} class="outlined">
    <div class="card">
        <div class="card-header">
            <p class="card-header-title is-centered"><slot name="title"></slot></p>
            {#if showCloseButton}
            <div class="card-header-icon">
                <CloseButton isVisible={open} on:click={() => dispatcher('dialog-closed') } />
            </div>
            {/if}
        </div>
        <div class="card-content">
            <slot></slot>
        </div>
    </div>
</dialog>


<style lang="scss">

// @import  '../../routes/styles.scss';

dialog {
    max-height: calc(100vh - 2rem);
    max-width: calc(100vw - 2rem);
    box-sizing: border-box;
    font-size: 1rem;
    overflow-y: hidden;
    padding: none;
    background: none;
    border: none;
}

dialog::backdrop {
    background: rgba(0, 0, 0, 0.2);
	backdrop-filter: blur(5px);
    --webkit-backdrop-filter: blur(5px);
}
</style>
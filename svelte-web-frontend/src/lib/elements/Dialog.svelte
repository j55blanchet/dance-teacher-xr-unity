<script lang="ts">
import { createEventDispatcher } from "svelte";
import CloseButton from "./CloseButton.svelte";

const dispatcher = createEventDispatcher();

let dialogElement: HTMLDialogElement | undefined;
export let open = false;
export let modal = true;
export let showCloseButton = true;
export let closeWhenClickedOutside = true;

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


<dialog bind:this={dialogElement} class="daisy-modal">
    <div class="daisy-modal-box w-auto h-auto ">
        <form method="dialog">
            <button class="daisy-btn daisy-btn-sm daisy-btn-circle absolute right-2 top-2"
                on:click={() => dispatcher('dialog-closed', 'button')}>✕</button>
        </form>
        <h3 class="font-bold text-lg"><slot name="title"></slot></h3>
        <slot></slot>
    </div>
    {#if closeWhenClickedOutside}
    <form method="dialog" class="daisy-modal-backdrop">
        <button on:click={() => dispatcher('dialog-closed', 'click_outside')}>close</button>
    </form>
    {/if}
  </dialog>

<!-- 
<dialog bind:this={dialogElement} class="daisy-modal">
    
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
 -->

<style lang="scss">

// @import  '../../routes/styles.scss';

.daisy-modal-box {
    max-height: calc(100vh - 2rem);
    max-width: calc(100vw - 2rem);
}

// dialog::backdrop {
//     background: rgba(0, 0, 0, 0.2);
// 	backdrop-filter: blur(5px);
//     --webkit-backdrop-filter: blur(5px);
// }
</style>
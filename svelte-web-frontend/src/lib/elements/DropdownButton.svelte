<script lang="ts">

export let position: 'top' | 'down' | 'left' | 'right' = 'down';
export let alignment: 'start' | 'end' = 'start';
export let btnClass: string = '';
export let menuOpen = false;
export let dismissWhenNotFocused = true;
</script>

{#if dismissWhenNotFocused}
<div class={`daisy-dropdown daisy-dropdown-${position}`}
    class:daisy-dropdown-end={alignment === 'end'}
    class:daisy-dropdown-open={menuOpen}>

    <div tabindex="0" role="button" class={`daisy-btn ${btnClass}`}>
        <slot name="buttonTitle"></slot>
    </div>
    <div class="daisy-dropdown-content">
        <slot></slot>
    </div>
</div>
{:else}
<details class={`daisy-dropdown daisy-dropdown-${position}`}>
    <summary class={`btn daisy-btn ${btnClass}`}>
        <slot name="buttonTitle"></slot>
    </summary>
    <div class="daisy-dropdown-content">
        <slot></slot>
    </div>
</details>
{/if}
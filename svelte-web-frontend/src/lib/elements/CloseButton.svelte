<script lang="ts">
export let isVisible = true;
</script>

<button class="button close x" class:isHidden={!isVisible} aria-label="close" on:click>
    <div class="svgContainer">    
        <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1 1">
        <path d="M0,0 L1,1 M1,0 L0,1" />
        </svg>
    </div>
</button>

<style lang="scss">
.close {
    margin-left: auto;
    /* margin-right: auto; */
    display: flex;
    align-items: center;
    justify-content: center;
    /* border-color: white; */
    /* color: white;
    background: rgba(0, 0, 0, 0.5);
    box-shadow: none;
    outline: 4px solid white; */
}

.close.x {
    /* width: 2rem; */
    /* height: 2rem; */
    
    display: flex;
    align-items: center;
    justify-content: center;
}

.svgContainer {
    width: 1em;
    height: 1em;
    display: flex;
    align-items: center;
    justify-content: center;
}

.close.x svg {
    width: 100%;
    height: 100%;
    stroke-width: 0.15px;
    stroke: var(--color-text);
    stroke-linecap: round;
    transition: width 0.25s ease-out, height 0.25s ease-out;
}

.close.isHidden svg {
    width: 0;
    height: 0;
}
</style>
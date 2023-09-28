<button class="button close x" aria-label="close" on:click>
    <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1 1">
    <path d="M0,0 L1,1 M1,0 L0,1" />
    </svg>
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

.close.x svg {
    width: 1em;
    height: 1em;
    stroke-width: 0.15px;
    stroke: var(--color-text);
    stroke-linecap: round;
}
</style>
<script lang="ts">

import { debugMode } from "$lib/utils/debugMode";
</script>

<section class="settingsPage">
    <nav>
        <a class="button outlined" href="/">&lt; Home</a>
    </nav>
    <h1>Settings</h1>

    <div>
        <label for="debugMode">Debug Mode</label>
        <input type="checkbox" name="debugMode" bind:checked={$debugMode}>
    </div>
</section>



<style lang="scss">
.settingsPage {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: start;
    height: 100vh;
}

nav {
    width: 100%;
    padding: 1rem;
}
</style>
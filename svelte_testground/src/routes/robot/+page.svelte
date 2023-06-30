<script lang="ts">
// # disable type checking for this file
// @ts-nocheck
import { onMount } from "svelte";

let robotIPAddress = "169.254.249.57";
let qiSession = undefined;
let lastEvent = ""

const onQiSessionConnected = (session: any) => {
    qiSession = session;
    lastEvent = "onQiSessionConnected";
};
const onQiSessionDisconnected = (session: any) => {
    qiSession = undefined;
    lastEvent = "onQiSessionDisconnected";
};


function connectToRobot() {
    QiSession(
        onQiSessionConnected, 
        onQiSessionDisconnected,
        robotIPAddress
    );
    lastEvent = "connectToRobot";
}

function disconnectFromRobot() {
    if (qiSession) {
        qiSession.close();
    }
    lastEvent = "disconnectFromRobot";
}

onMount(() => {

    // Ensure we disconnect from the robot when the page is unloaded
    return () => {
        disconnectFromRobot();
    };
});

</script>

<svelte:head>
	<title>Test Robot Control</title>
    <meta name="description" content="Test page for controlling the Nao robot from Javascript" />
</svelte:head>


<section>
    <nav>
        <a class="button" href="/">&lt; Go Home</a>
        <h1 class="title">
            Test Robot Control
        </h1>
        <div>{lastEvent}</div>
    </nav>
    <main>
        {#if qiSession === undefined}
        <form class="connect outlined thin" on:submit|preventDefault={connectToRobot}>
            <h2>Connect</h2>
            <label>
                Robot IP Address
                <input type="text" name="robot_ip" id="robot_ip" bind:value={robotIPAddress}>
            </label>
            <input type="submit" value="Connect">
        </form>
        {:else}
        <form class="connect outlined thin" on:submit|preventDefault={disconnectFromRobot}>
            <h2>Connected</h2>
            <button>Disconnect</button>
            <input type="submit">
        </form>

        {/if}
    </main>
</section>


<style lang="scss">
section {
    min-height: 100vh;
    width: 100%;
    display: flex;
    flex-direction: column;
}

main {
    flex-grow: 1;
    flex-basis: 0;
    flex-shrink: 1;
    margin: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

form.connect {
    background: white;
    padding: 1rem;
    // border-radius: var(--std-border-radius);

    & h2 {
        font-size: 1.5rem;
    }
}

label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: center;
    margin: 0.5rem 0;
}
</style>
<script lang="ts">
	import { error } from '@sveltejs/kit';

import { webcamStream } from './streams';

let state: 'start' | 'busy' | 'devicelist' | 'success' = 'start';
let lastError: any | undefined = undefined;
let videoDeviceList: MediaDeviceInfo[] = [];
let audioDeviceList: MediaDeviceInfo[] = [];

let selectedAudioDeviceId: MediaDeviceInfo["deviceId"] | undefined = undefined;
let selectedVideoDeviceId: MediaDeviceInfo["deviceId"] | undefined = undefined;

async function startWebcam() {
    state = 'busy';
    lastError = undefined;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true,
            audio: true
        });
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDeviceList = devices.filter(device => device.kind === 'videoinput');
        audioDeviceList = devices.filter(device => device.kind === 'audioinput');

        if (videoDeviceList.length === 0) {
            state = 'start';
            lastError = new Error('No devices found');
            return;
        } 
        if (videoDeviceList.length === 1) {
            webcamStream.set(stream);
            state = 'success';
            return;
        }

        selectedVideoDeviceId = videoDeviceList[0].deviceId;
        selectedAudioDeviceId = audioDeviceList[0].deviceId;
        state = 'devicelist';
    }
    catch (error) {
        lastError = error;
        state = 'start';
        return;
    }
}
async function selectDevices()  {
    lastError = undefined;
    state = 'busy';

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: selectedVideoDeviceId },
            audio: { deviceId: selectedAudioDeviceId }
        });
        webcamStream.set(stream);
        state = 'success';
    } catch(error) {
        lastError = error;
        state = 'devicelist';
    }
}
</script>



<div class="webcamSelector">
    {#if state === "start"}
    <button id="startWebcam" class="button outlined thin" on:click={startWebcam}>
        Start Webcam
    </button>
        {#if lastError}
        <div class="error">
            <p>Failed to start webcam</p>
            <p>{lastError?.message}</p>
        </div>
        {/if}
    {:else if state === "busy"}
    <div class="spinner"></div>
    {:else if state === "devicelist"}
        <label for="videoDevices">Video Devices</label>
        <select name="videoDevices" class="outlined thin" bind:value={selectedVideoDeviceId}>
            {#each videoDeviceList as device}
            <option value={device.deviceId}>{device.label}</option>
            {/each}
        </select>
        <div class="spacer"></div>
        <label for="audioDevices">Audio Devices</label>
        <select name="audioDevices" class="outlined thin" bind:value={selectedAudioDeviceId}>
            {#each audioDeviceList as device}
            <option value={device.deviceId}>{device.label}</option>
            {/each}
        </select>
        <div class="spacer"></div>
        <button class="button outlined thin" on:click={selectDevices}>Start Webcam</button>
    {:else if state === "success"}
        <div>Webcam Started</div>
    {/if}

</div>

<style lang="scss">

.spinner {
  border: 16px solid #f3f3f3; /* Light grey */
  border-top: 16px solid var(--color-text); /* Dark grey */
  border-radius: 50%;
  width: 60px;
  height: 60px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.webcamSelector {
    display: flex;
    flex-direction: column;
    align-items: start;
    justify-content: center;
    height: 100%;
    gap: 0.25rem;
}

.spacer {
    height: 1rem;
}
</style>
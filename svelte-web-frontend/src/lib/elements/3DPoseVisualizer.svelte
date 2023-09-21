<script lang="ts">
import { getMagnitude3DVec } from "$lib/ai/EvaluationCommonUtils";
import type { Landmark3D, Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";
import { PoseLandmarker } from "@mediapipe/tasks-vision";

// import THREE from 'threejs';

export let pose3d: Pose3DLandmarkFrame | undefined;

function calculateCapsuleInfoForPose3d(pose3d: Pose3DLandmarkFrame) {
    return PoseLandmarker.POSE_CONNECTIONS.map((connection) => {
        const { start, end } = connection;
        const landmarkStart = pose3d?.[start];
        const landmarkEnd = pose3d?.[end];
        if (!landmarkStart || !landmarkEnd) throw new Error(`Unexpectedly null landmark! Indices: (${start} -> ${end}), pose3d: ${pose3d}`);

        const x =  (landmarkStart.x + landmarkEnd.x) / 2;
        const y = (landmarkStart.y + landmarkEnd.y) / 2;
        const z = (landmarkStart.z + landmarkEnd.z) / 2;

        const vectorLength = getMagnitude3DVec([
            landmarkEnd.x - landmarkStart.x,
            landmarkEnd.y - landmarkStart.y,
            landmarkEnd.z - landmarkStart.z
        ])

        // todo: calculate rotation in x, y, and z directions.
        const rotX = 0;
        const rotY = 0;
        const rotZ = 0;

        const lengthX = vectorLength;
        const lengthY = 0.05;
        const lengthZ = 0.05;

        return {
            x: x,
            y: y,
            z: z,
            rotX,
            rotY,
            rotZ,
            lengthX,
            lengthY,
            lengthZ
        }
    })
}


let capsules = [] as ReturnType<typeof calculateCapsuleInfoForPose3d>;
$: {
    if (!pose3d) {
        capsules = [];   
    } else {
        capsules = calculateCapsuleInfoForPose3d(pose3d);
    }
}
</script>

<a-scene embedded>
{#if pose3d}
    {#each capsules as cap}
        <a-cylinder position={`${cap.x} ${cap.y} ${cap.z}`}>
        </a-cylinder>
    {/each}
{/if}
</a-scene>



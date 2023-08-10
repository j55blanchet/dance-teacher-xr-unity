// import { * } from "@mediapipe/pose";
import { simd } from "wasm-feature-detect";

import { PoseLandmarker } from "@mediapipe/tasks-vision";

// const wasm_loader = import('@mediapipe/tasks-vision/wasm/vision_wasm_internal');
// const wasm_nosimd_ploader = import('@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal')

// export type PostMessages = 'request-pose-estimation'; 
export enum ResponseMessages {
    poseEstimation = 'poseEstimation',
    error = 'error',
    resetComplete = 'resetComplete',
    resetError = 'resetError'
};

// Create enum of PoseMessages
export enum PostMessages {
    requestPoseEstimation = 'requestPoseEstimation',
    reset = 'reset'
};

const IS_WEB_WORKER = false;

async function loadPoseLandmarkerModel() {

    const supportsSimd = await simd();

    const MP_FOLDER = "/mediapipe";
    const wasmVisionFileset = {
        wasmLoaderPath: `${MP_FOLDER}/vision_wasm_nosimd_internal.js`,
        wasmBinaryPath: `${MP_FOLDER}/vision_wasm_nosimd_internal.wasm`
    }
    if (supportsSimd) {
        wasmVisionFileset.wasmLoaderPath = `${MP_FOLDER}/vision_wasm_internal.js`;
        wasmVisionFileset.wasmBinaryPath = `${MP_FOLDER}/vision_wasm_internal.wasm`;
    }
    
    const runningMode = "VIDEO";
    
    const poseLandmarker = await PoseLandmarker.createFromOptions(wasmVisionFileset, {
        baseOptions: {
          modelAssetPath: `/mediapipe/pose_landmarker_lite.task`,
          delegate: "GPU"
        },
        runningMode: runningMode,
        numPoses: 2
    });
    
    return poseLandmarker;
}

export default class PoseEstimationWorker {

    private poseLandmarker: null | PoseLandmarker = null;

    public onmessage: (msg: any) => void = () => {};

    public ready: Promise<void>;

    private responseFunctions: Map<PostMessages, (id: number, msg: any) => void> = new Map();

    constructor() {
        this.ready = new Promise(async (res, rej) => {
            try {
                this.poseLandmarker = await loadPoseLandmarkerModel();
                res();
            } catch (e) {
                rej(e);
            }
        })

        this.responseFunctions.set(
            PostMessages.requestPoseEstimation, 
            this.handlePoseEstimationRequest.bind(this)
        );
        this.responseFunctions.set(
            PostMessages.reset, 
            this.handleReset.bind(this)
        );
    }

    /**
     * Post a message to this pose estimation worker. To request a pose estimation,
     * send a message with the following format:
     * ```
     * {
     *    type: "pose-estimation-request",
     *    image: ImageData,
     *    timestampMs: number,
     *    frameId: number
     * }
     * ```
     * @param msg Message from the main thread. Should contain an image and a timestamp
     */
    public postMessage(msg: any): void {

        // Messages receieved as a WebWorker have the data object placed in `msg.data`, whereas
        // when we're not loaded as a WebWorker and this function is called in the main thread, the
        // data object will be the parameter itself. This is a bit of a hack to make it work in both
        // cases.
        let msgData = msg; // Not a WebWorker
        if (IS_WEB_WORKER) {
            msgData = msg.data // WebWorker
        }
        const frameId = msgData?.frameId ?? -1;

        if (!msgData || !msgData.type) {
            this.respondWithError(
                frameId,
                "Invalid message format",
            );
            return;
        }

        if (!Object.values(PostMessages).includes(msgData.type)) {
            this.respondWithError(
                frameId,
                "Invalid message type: " + msgData.type  + ". The valid types are: " + Object.values(PostMessages).join(", "),
            );
            return;
        }

        this.responseFunctions.get(msgData.type)?.(frameId, msgData);
    }

    private handleReset(frameId: number, msgData: any) {
        this.poseLandmarker?.close();
        this.poseLandmarker = null;
        this.ready = new Promise(async (res, rej) => {
            try {
                this.poseLandmarker = await loadPoseLandmarkerModel();
                res();
                this.respondWithMessage(ResponseMessages.resetComplete, frameId, {});
            } catch (e) {
                rej(e);
                this.respondWithMessage(ResponseMessages.resetError, frameId, {
                    error: e
                });
            }
        })
    }

    private handlePoseEstimationRequest(frameId: number, msgData: any) {
        // Ensure poseLandmarker is initialized
        if (!this.poseLandmarker) {
            this.respondWithError(
                frameId,
                "PoseLandmarker not initialized",
            );
            return;
        }

        // Ensure the message contains the required data
        if (!msgData.image || !msgData.timestampMs) {
            this.respondWithError(
               frameId,
        "Missing image or timestampMs property",
            );
            return;
        }

        const poseLandmarkerResult = this.poseLandmarker.detectForVideo(
            msgData.image,
            msgData.timestampMs
        )

        const allNormalizedPoses = (poseLandmarkerResult?.landmarks ?? [])
        const firstUserPose = allNormalizedPoses[0] ?? null;

        this.respondWithMessage(ResponseMessages.poseEstimation, frameId, {
            landmarkerResult: poseLandmarkerResult,
            estimatedPose: firstUserPose,
            srcWidth: msgData.image.width,
            srcHeight: msgData.image.height
        });
    }

    /**
     * Send a message back to the calling code. If we're running as a WebWorker, this will
     * post the message back to the main thread.
     * @param msg Message to send
     */
    private respondWithMessage(type: ResponseMessages, frameId: number, data: any) {
        let msg = {
            ...data,
            frameId,
            type
        };

        // If we're not running as a WebWorker, we need to wrap the message in a data object
        // so that the consuming code can access it in the same way as if it were running
        // as a WebWorker.
        if (!IS_WEB_WORKER) {
            msg = {
                data: msg
            }
        }

        this.onmessage(msg);
    }

    /**
     * Send an error message back to the calling code. This helper function ensures that all 
     * error messages are formatted the same way.
     * @param frameId FrameId to associate the error with
     * @param error Error message
     */
    private respondWithError(frameId: number, error: string) {
        this.respondWithMessage(ResponseMessages.error, frameId, {
            error
        });
    }

    /**
     * Terminate this worker. This should be called when the worker is no longer needed.
     */
    public terminate() {
        this.poseLandmarker?.close();
    }
}


export const worker = new PoseEstimationWorker();
// import { * } from "@mediapipe/pose";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

// const wasm_loader = import('@mediapipe/tasks-vision/wasm/vision_wasm_internal');
// const wasm_nosimd_ploader = import('@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal')

// export type PostMessages = 'request-pose-estimation'; 
export enum ResponseMessages {
    poseEstimation = 'poseEstimation',
    error = 'error'
};

// Create enum of PoseMessages
export enum PostMessages {
    requestPoseEstimation = 'requestPoseEstimation'
};

const IS_WEB_WORKER = false;

async function loadPoseLandmarkerModel() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10/wasm"
    );
    
    const runningMode = "VIDEO";
    
    const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU"
        },
        runningMode: runningMode,
        numPoses: 2
    });
    
    return poseLandmarker;
}

// let poseLandmarker: null | PoseLandmarker = null;

// loadModel().then((model) => {
//     poseLandmarker = model;
// });

// const pose = new Pose({locateFile: (file) => {
    // return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
//   }});

// self.importScripts("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js");

// import("@mediapipe/pose")

// let poseLandmarker = null;

// onmessage = (msg) => {

//     if (!msg) {
//         return;
//     }

//     if (!poseLandmarker) {
//         postMessage({
//             type: "pose-estimation",
//             frameId: msg.data.frameId,
//             result: null
//         });
//         return;
//     }

//     const result = poseLandmarker.detectForVideo(
//         msg.data.image,
//         msg.data.timestampMs
//     )

//     postMessage({
//         type: "pose-estimation",
//         frameId: msg.data.frameId,
//         result: result
//     });
// }

// export {};

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

        this.responseFunctions.set(PostMessages.requestPoseEstimation, this.handlePoseEstimationRequest.bind(this));
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

        const result = this.poseLandmarker.detectForVideo(
            msgData.image,
            msgData.timestampMs
        )

        this.respondWithMessage(ResponseMessages.poseEstimation, frameId, {
            result
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
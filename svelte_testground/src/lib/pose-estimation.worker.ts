// import { * } from "@mediapipe/pose";
import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

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

    constructor() {
        this.loadModel();
    }

    private async loadModel() {
        this.poseLandmarker = await loadPoseLandmarkerModel();
    }

    public postMessage(msg: any) {

        msg = {
            data: msg
        };

        if (!this.poseLandmarker || 
            !msg.data || 
            !msg.data.image || 
            !msg.data.timestampMs
        ) {
            this.onmessage({
                data: {
                    type: "pose-estimation",
                    frameId: msg.data.frameId,
                    result: null
                }
            });
            return;
        }

        const result = this.poseLandmarker.detectForVideo(
            msg.data.image,
            msg.data.timestampMs
        )

        this.onmessage({
            data: {
                type: "pose-estimation",
                frameId: msg.data.frameId,
                result: result
            }
        });
    }

    public terminate() {
        this.poseLandmarker?.close();
    }
}
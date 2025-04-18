import type { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { Image } from "plotly.js-dist-min";

// the minified code for wasmFeatureDetect
!function (e, n) { "object" == typeof exports && "undefined" != typeof module ? module.exports = n() : "function" == typeof define && define.amd ? define(n) : (e = "undefined" != typeof globalThis ? globalThis : e || self).wasmFeatureDetect = n() }(this, (function () { "use strict"; return { bigInt: () => (async e => { try { return (await WebAssembly.instantiate(e)).instance.exports.b(BigInt(0)) === BigInt(0) } catch (e) { return !1 } })(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 6, 1, 96, 1, 126, 1, 126, 3, 2, 1, 0, 7, 5, 1, 1, 98, 0, 0, 10, 6, 1, 4, 0, 32, 0, 11])), bulkMemory: async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 3, 1, 0, 1, 10, 14, 1, 12, 0, 65, 0, 65, 0, 65, 0, 252, 10, 0, 0, 11])), exceptions: async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 8, 1, 6, 0, 6, 64, 25, 11, 11])), exceptionsFinal: () => (async () => { try { return new WebAssembly.Module(Uint8Array.from(atob("AGFzbQEAAAABBAFgAAADAgEAChABDgACaR9AAQMAAAsACxoL"), (e => e.codePointAt(0)))), !0 } catch (e) { return !1 } })(), extendedConst: async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 5, 3, 1, 0, 1, 11, 9, 1, 0, 65, 1, 65, 2, 106, 11, 0])), gc: () => (async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 95, 1, 120, 0])))(), jsStringBuiltins: () => (async () => { try { return await WebAssembly.instantiate(Uint8Array.from(atob("AGFzbQEAAAABBgFgAW8BfwIXAQ53YXNtOmpzLXN0cmluZwR0ZXN0AAA="), (e => e.codePointAt(0))), {}, { builtins: ["js-string"] }), !0 } catch (e) { return !1 } })(), jspi: () => (async () => "Suspending" in WebAssembly)(), memory64: async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 5, 3, 1, 4, 1])), multiMemory: () => (async () => { try { return new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 5, 5, 2, 0, 0, 0, 0])), !0 } catch (e) { return !1 } })(), multiValue: async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 6, 1, 96, 0, 2, 127, 127, 3, 2, 1, 0, 10, 8, 1, 6, 0, 65, 0, 65, 0, 11])), mutableGlobals: async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 2, 8, 1, 1, 97, 1, 98, 3, 127, 1, 6, 6, 1, 127, 1, 65, 0, 11, 7, 5, 1, 1, 97, 3, 1])), referenceTypes: async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 7, 1, 5, 0, 208, 112, 26, 11])), relaxedSimd: async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 15, 1, 13, 0, 65, 1, 253, 15, 65, 2, 253, 15, 253, 128, 2, 11])), saturatedFloatToInt: async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 12, 1, 10, 0, 67, 0, 0, 0, 0, 252, 0, 26, 11])), signExtensions: async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 8, 1, 6, 0, 65, 0, 192, 26, 11])), simd: async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])), streamingCompilation: () => (async () => "compileStreaming" in WebAssembly)(), tailCall: async () => WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 6, 1, 4, 0, 18, 0, 11])), threads: () => (async e => { try { return "undefined" != typeof MessageChannel && (new MessageChannel).port1.postMessage(new SharedArrayBuffer(1)), WebAssembly.validate(e) } catch (e) { return !1 } })(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 5, 4, 1, 3, 1, 1, 10, 11, 1, 9, 0, 65, 0, 254, 16, 2, 0, 26, 11])), typeReflection: () => (async () => "Function" in WebAssembly)(), typedFunctionReferences: () => (async () => { try { return new WebAssembly.Module(Uint8Array.from(atob("AGFzbQEAAAABEANgAX8Bf2ABZAABf2AAAX8DBAMBAAIJBQEDAAEBChwDCwBBCkEqIAAUAGoLBwAgAEEBagsGANIBEAAL"), (e => e.codePointAt(0)))), !0 } catch (e) { return !1 } })() } }));

let poseLandmarker: PoseLandmarker | undefined;

enum ResponseMessages {
    poseEstimation = 'poseEstimation',
    error = 'error',
    resetComplete = 'resetComplete',
    resetError = 'resetError'
};

// Create enum of PoseMessages
enum PostMessages {
    requestPoseEstimation = 'requestPoseEstimation',
    reset = 'reset',
    confirmReady = 'confirmReady',
};

async function loadPoseLandmarkerModel() {
    
    const supportsSimd = await wasmFeatureDetect.simd();

    const MP_FOLDER = "/mediapipe";
    const wasmVisionFileset = {
        wasmLoaderPath: `${MP_FOLDER}/vision_wasm_nosimd_internal.js`,
        wasmBinaryPath: `${MP_FOLDER}/vision_wasm_nosimd_internal.wasm`
    }
    if (supportsSimd) {
        wasmVisionFileset.wasmLoaderPath = `${MP_FOLDER}/vision_wasm_internal.js`;
        wasmVisionFileset.wasmBinaryPath = `${MP_FOLDER}/vision_wasm_internal.wasm`;
        console.warn("SIMD supported. Loading vision_wasm_internal packages");
    } else {
        console.warn("SIMD not supported. Loading vision_wasm_nosimd_internal packages");
    }
    
    const runningMode = "VIDEO";

    const TasksVisionModule = await import("@mediapipe/tasks-vision");
    const poseLandmarker = await TasksVisionModule.PoseLandmarker.createFromOptions(wasmVisionFileset, {
        baseOptions: {
          modelAssetPath: `/mediapipe/pose_landmarker_lite.task`,
          delegate: "GPU"
        },
        runningMode: runningMode,
        numPoses: 2
    });
    
    console.log("Loaded pose landmarker model");

    return poseLandmarker;
}

self.onmessage = async function (event: MessageEvent) {
    const data = event.data;

    console.log('Got message in pose estimation worker: ', data);

    if (!event.data.type) {
        console.warn("pose-estimation.worker.ts:: Received message without type", event);
        self.postMessage({
            type: ResponseMessages.error,
            message: 'Invalid type',
        })
        return;
    }

    if (event.data.type == PostMessages.confirmReady && poseLandmarker) {
        self.postMessage({
            type: ResponseMessages.resetComplete,
        });
    }

    if (event.data.type == PostMessages.reset) {
        if (poseLandmarker) {
            console.log("Reloading pose landmarker model");
        } else {
            console.log("Loading pose landmarker model for the first time");
        }
        
        poseLandmarker = undefined;
        poseLandmarker = await loadPoseLandmarkerModel() ?? undefined;

        self.postMessage({
            type: ResponseMessages.resetComplete,
        });
    }

    if (event.data.type == PostMessages.requestPoseEstimation) {
        const {
            frameId,
            timestampMs,
            image
        } = event.data;

        if (!frameId || !timestampMs || !image) {
            console.warn("pose-estimation.worker.ts:: Received message without required data", event);
            self.postMessage({
                type: ResponseMessages.error,
                message: 'Invalid data',
            })
            return;
        }

        if (!poseLandmarker) {
            console.warn("pose-estimation.worker.ts:: poseLandmarker not initialized");
            self.postMessage({
                type: ResponseMessages.error,
                message: 'PoseLandmarker not initialized',
            })
            return;
        }

        const poseResult = poseLandmarker?.detectForVideo(image, timestampMs);

        self.postMessage({
            type: ResponseMessages.poseEstimation,
            frameId,
            landmarkerResult: poseResult,
            srcWidth: image.width,
            srcHeight: image.height
        });
    }
};
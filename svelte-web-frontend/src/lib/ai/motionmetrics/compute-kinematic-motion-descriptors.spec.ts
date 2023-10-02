import { describe, it } from 'vitest';
import { calculateVels, calculateDerivative, type Vec2, calculateKinematicErrorDescriptors } from './compute-kinematic-motion-descriptors.ts';
import { type Pose2DPixelLandmarks, PoseLandmarkKeys, type PixelLandmark } from '$lib/webcam/mediapipe-utils.js';


function makeRandom2DPoseFrame(): Pose2DPixelLandmarks {
    return PoseLandmarkKeys.map(() => {
        const randomLM: PixelLandmark = {
            x: Math.random() * 100,
            y: Math.random() * 100,
            dist_from_camera: Math.random() * 100
        }
        return randomLM;
    });
}
function makeRandom2DPoseFrames(numFrames: number): Pose2DPixelLandmarks[] {
    return [...Array(numFrames)].map(() => makeRandom2DPoseFrame());
}

function isAllUndefined(arr: any[]): boolean {
    return arr.every((val) => 
        Array.isArray(val) ? 
            isAllUndefined(val) : 
            val === undefined
    );
}
function isAnyUndefined(arr: any[]): boolean {
    return arr.some((val) =>
        Array.isArray(val) ?
            isAnyUndefined(val) :
            val === undefined
    );
}

describe('calculateVels', () => {

    it.concurrent('should return an empty array for empty input', ({ expect }) => {
        const result = calculateVels([], [], 1);
        expect(result).toHaveLength(0);
    });

    it.concurrent('should throw error for mismatched array lengths', ({ expect }) => {
        expect(() => {
            const frameTimes = [1, 2, 3];
            const poseFrames = makeRandom2DPoseFrames(4);
            const scale = 1;
            calculateVels(
                poseFrames, 
                frameTimes, 
                scale
            );
        }).toThrow();
    });
    
    it.concurrent('should return an undefined pose for first frame only', ({ expect }) => {
        const frameCount = 3
        const poseFrames = makeRandom2DPoseFrames(frameCount);
        const frameTimes = [...Array(frameCount)].map((_, i) => i);
        const scale = 1

        const result = calculateVels(poseFrames, frameTimes, scale);
        expect(result).toHaveLength(frameCount);

        const [firstFrame, secondFrame, thirdFrame] = result;
        expect(isAllUndefined(firstFrame)).toBeTruthy();
        expect(isAnyUndefined(secondFrame)).toBeFalsy();
        expect(isAnyUndefined(thirdFrame)).toBeFalsy();
    });

    it.concurrent('should return expected values for a simple case', ({ expect }) => {

        const poseFrame1: PixelLandmark[] = [
            { x: 0.5, y: 0.25, dist_from_camera: 0 },
        ]
        const poseFrame2: PixelLandmark[] = [
            { x: 1.1, y: -0.1, dist_from_camera: 1 },
        ]

        const frameStartTime = 0.14;
        const fps = 2
        const secsPerFrame = 1 / fps
        const frameTimes = [frameStartTime, + frameStartTime + secsPerFrame];
        const scale = 1;

        const result = calculateVels(
            [poseFrame1, poseFrame2],
            frameTimes,
            scale
        );

        expect(result).toHaveLength(2);
        const [firstFrame, secondFrame] = result;
        expect(isAllUndefined(firstFrame)).toBeTruthy();
        expect(isAnyUndefined(secondFrame)).toBeFalsy();

        const [dx, dy] = secondFrame[0];
        expect(dx).toBeCloseTo(0.6 * fps);
        expect(dy).toBeCloseTo(-0.35 * fps);
    });
});


describe('calculateDerivative', () => {

    it.concurrent('should return an empty array for empty input', ({ expect }) => {
        const result = calculateDerivative([], []);
        expect(result).toHaveLength(0);
    });

    it.concurrent('should produce expected results for simple testcase', ({ expect }) => {

        const firstValues = [ [1, 1] ] as Vec2<number>[];
        const secondValues = [ [2.2, 1.2] ] as Vec2<number>[];
        const input = [firstValues, secondValues];
        const fps = 2.3;
        const secsPerFrame = 1 / fps;
        const startTime = 0.1;
        const frameTimes = [startTime, startTime + secsPerFrame];


        const result = calculateDerivative(input, frameTimes);

        expect(result).toHaveLength(2);
        const [firstResultFrame, secondResultFrame] = result;
        expect(firstResultFrame).toHaveLength(1);
        expect(firstResultFrame[0][0]).toBeUndefined(); // x
        expect(firstResultFrame[0][1]).toBeUndefined(); // y

        expect(secondResultFrame).toHaveLength(1);
        expect(secondResultFrame[0][0]).toBeCloseTo(1.2 / secsPerFrame); // x
        expect(secondResultFrame[0][1]).toBeCloseTo(0.2 / secsPerFrame); // y
    });
});


describe('calculateKinematicErrorDescriptors', () => {

    it.concurrent('should produce zero scores for constant position offsets', ({ expect }) => {

        // In this test case, user's left side is -0.1 off and the right side is 0.2 off 
        // in position. This shouldn't affect any metrics and they should all be zero.)
        const refPoses: Pose2DPixelLandmarks[] = [
            [{ x: 0.1, y: 0.1, dist_from_camera: 0 }, { x: 1, y: 1, dist_from_camera: 1 }],
            [{ x: 1.1, y: 1.1, dist_from_camera: 1 }, { x: 2, y: 2, dist_from_camera: 2 }],
            [{ x: 2.1, y: 2.1, dist_from_camera: 2 }, { x: 3, y: 3, dist_from_camera: 3 }],
            [{ x: 3.1, y: 2.1, dist_from_camera: 3 }, { x: 4, y: 4, dist_from_camera: 4 }],
            [{ x: 3.1, y: 3.1, dist_from_camera: 4 }, { x: 5, y: 5, dist_from_camera: 5 }],
        ]
        const userPoses: Pose2DPixelLandmarks[] = [
            [{ x: 0, y: 0, dist_from_camera: 0 }, { x: 1.2, y: 1.2, dist_from_camera: 1 }],
            [{ x: 1, y: 1, dist_from_camera: 1 }, { x: 2.2, y: 2.2, dist_from_camera: 2 }],
            [{ x: 2, y: 2, dist_from_camera: 2 }, { x: 3.2, y: 3.2, dist_from_camera: 3 }],
            [{ x: 3, y: 2, dist_from_camera: 3 }, { x: 4.2, y: 4.2, dist_from_camera: 4 }],
            [{ x: 3, y: 3, dist_from_camera: 4 }, { x: 5.2, y: 5.2, dist_from_camera: 5 }],
        ]
        const fps = 1 + Math.random() * 10;
        const secPerFrame = 1 / fps;
        const startTime = Math.random() * 1000;
        const frameTimes = [
            startTime, 
            startTime + secPerFrame, 
            startTime + 2 * secPerFrame, 
            startTime + 3 * secPerFrame,
            startTime + 4 * secPerFrame,
        ];
        const usrScale = 1;
        const refScale = 1;

        const result = calculateKinematicErrorDescriptors(
            refPoses,
            userPoses,
            frameTimes,
            usrScale,
            refScale,
        );

        console.log(result)
        expect(result).not.toBeNull();
        expect(result.accsMAE).toBeCloseTo(0);
        expect(result.accsRSME).toBeCloseTo(0);
        expect(result.jerksMAE).toBeCloseTo(0);
        expect(result.jerksRSME).toBeCloseTo(0);
        expect(result.velsMAE).toBeCloseTo(0);
        expect(result.velsRSME).toBeCloseTo(0);
    });

    it.concurrent('should produce expected scores for test case', ({ expect }) => {

        // In this test case, user's left side is -0.1 off and the right side is 0.2 off 
        // in position. This shouldn't affect any metrics and they should all be zero.)
        const refPoses: Pose2DPixelLandmarks[] = [
            [{ x: 2.00, y: 3.00, dist_from_camera: 0 }],
            [{ x: 1.90, y: 3.20, dist_from_camera: 0 }],
            [{ x: 1.85, y: 3.40, dist_from_camera: 0 }],
            [{ x: 1.90, y: 3.70, dist_from_camera: 0 }],
            [{ x: 2.00, y: 4.10, dist_from_camera: 0 }],
        ]
        const userPoses: Pose2DPixelLandmarks[] = [
            [{ x: 1.00, y: 3.00, dist_from_camera: 0 }],
            [{ x: 1.01, y: 3.10, dist_from_camera: 0 }],
            [{ x: 0.80, y: 3.21, dist_from_camera: 0 }],
            [{ x: 0.82, y: 3.35, dist_from_camera: 0 }],
            [{ x: 0.90, y: 3.30, dist_from_camera: 0 }],
        ]
        const fps = 1.0
        const secPerFrame = 1 / fps;
        const startTime = Math.random() * 1000;
        const frameTimes = [
            startTime, 
            startTime + secPerFrame, 
            startTime + 2 * secPerFrame, 
            startTime + 3 * secPerFrame,
            startTime + 4 * secPerFrame,
        ];
        const usrScale = 1;
        const refScale = 1;

        // dv = [?, 0.1, 0.2, 0.4, 2.0]   MAE = 2.7 / 4 = 0.425    RSME = 0.55
        // da = [?,   ?, 0.1, 0.2, 0.6]   MAE = 0.9 / 3 = 0.3      RSME = 0.36968455
        // dj = [?,   ?,   ?, 0.1, 0.4]   MAE = 0.5 / 2 = 0.25     RSME = 0.291547595

        const result = calculateKinematicErrorDescriptors(
            userPoses,
            refPoses,
            frameTimes,
            usrScale,
            refScale,
        );

        console.log(result)
        expect(result).not.toBeNull();
        expect(result.velsMAE).toBeCloseTo(0.15868, 4);
        expect(result.velsRSME).toBeCloseTo(0.18953, 4);
        expect(result.accsMAE).toBeCloseTo(0.11607, 4);
        expect(result.accsRSME).toBeCloseTo(0.12223, 4);
        expect(result.jerksMAE).toBeCloseTo(0.28333, 4);
        expect(result.jerksRSME).toBeCloseTo(0.28868, 4);
    });
});
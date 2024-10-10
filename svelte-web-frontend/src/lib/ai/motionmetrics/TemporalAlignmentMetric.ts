import type { Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";
import { getMagnitude3DVec } from "../EvaluationCommonUtils";
import type { SummaryMetric, TrackHistory } from "./MotionMetric";
import { writeFileSync } from 'fs';
import { join } from 'path';

type TemporalAlignmentMetricOutput = ReturnType<TemporalAlignmentMetric['summarizeMetric']>;
type TemporalAlignmentMetricFormattedOutput = ReturnType<TemporalAlignmentMetric['formatSummary']>;


function calculateImpactEnvelope(frameHistory: Pose3DLandmarkFrame[]) {

    // Step 1. Calculate pose flow -- direction that each body part is moving at each frame
    const poseFlow = frameHistory.map((frame, index, arr) => {
        const nextFrame = arr[index + 1];
        if (!nextFrame) {
            return null;
        }
        
        return frame.map((joint, jointIndex) => {
            const nextJoint = nextFrame[jointIndex];
            return {
                x: nextJoint.x - joint.x,
                y: nextJoint.y - joint.y,
                z: nextJoint.z - joint.z,
            }
        });
    });

    // Step 2: Construct the Posegram -- bin each pose flow vector into a 2D histogram
    //      where the x-axis is the frame index and the y-axis is the directional bin (8 directions).
    const binDirections = 8;
    const posegram = poseFlow.map((frame, frameIndex) => {
        const bins = new Array<number>(binDirections).fill(0);
        if (!frame) {
            return bins;
        }
        
        frame.forEach((joint) => {
            // determine which bin the joint's flow vector belongs to in 3D space
            // and add the flow vector magnitude to the bin value
            const polarAngle = Math.atan2(joint.y, joint.x);
            const polarQuadrant = Math.floor(((polarAngle + Math.PI) % (2 * Math.PI)) / (Math.PI / 2));
            if (polarQuadrant < 0 || polarQuadrant >= 4) {
                throw new Error("Something is wrong, calculated an invalid polar quadrant of " + polarQuadrant);
            }
            const binIndex = joint.z > 0 ? polarQuadrant + 4 : polarQuadrant;
            bins[binIndex] += getMagnitude3DVec([joint.x, joint.y, joint.z]);
        });

        return bins;
    });

    // Step 3: Calculate posegram flux - the derivative of the posegram at each bin
    const posegramFlux = posegram.map((posegramFrame, frameIndex, arr) => {
        const nextPosegramFrame = arr[frameIndex + 1];
        if (!nextPosegramFrame) {
            return new Array<number>(binDirections).fill(0);
        }
        return posegramFrame.map((binValue, binIndex) => {
            const nextBinvalue = nextPosegramFrame[binIndex];
            return nextBinvalue - binValue;
        });
    });

    // Step 4: Compute the impact envelope by summing the absolute value of prosegram flux for each frame
    const impactEnvelope = posegramFlux.map((frame) => {
        return frame.reduce((acc, binValue) => acc + Math.abs(binValue), 0);
    }, 0);

    return impactEnvelope;
}

function weighByGaussian(impactEnvelope: number[], envelopeCenterIndex: number, envelopeSegmentLength: number) {
    return impactEnvelope.map((value, index) => {
        return value * Math.exp(-Math.pow(index - envelopeCenterIndex, 2) / (2 * Math.pow(envelopeSegmentLength / 2, 2)));
    });
}

// REFACTORING:: will need to support looking at adjacent segments in the future!
export default class TemporalAlignmentMetric implements SummaryMetric<TemporalAlignmentMetricOutput, TemporalAlignmentMetricFormattedOutput> {
    summarizeMetric(history: TrackHistory) {

        if (history.user3DFrameHistory.length !== history.ref3DFrameHistory.length) {
            throw new Error("Impact envelope calculation failed: user and reference impact envelopes are different lengths");
        }
        if (history.user3DFrameHistory.length < 2) {
            throw new Error("Impact envelope calculation failed: not enough frames to calculate impact envelope");
        }

        const userImpactEnvelope = calculateImpactEnvelope(history.user3DFrameHistory);
        const referenceImpactEnvelope = calculateImpactEnvelope(history.ref3DFrameHistory);

        function saveEnvelopesToCSV(userEnvelope: number[], referenceEnvelope: number[], filePath: string) {
            const csvContent = userEnvelope.map((value, index) => `${value},${referenceEnvelope[index]}`).join('\n');
            writeFileSync(filePath, csvContent, 'utf8');
        }

        const filePath = 'testResults/impact_envelopes.csv';
        saveEnvelopesToCSV(userImpactEnvelope, referenceImpactEnvelope, filePath);

        // create a array of weights corresponding to a gaussian distribution
        // with a mean at the center of the impact envelope and a standard deviation of 1/2 
        // the length of the envelope
        const envelopeLength = userImpactEnvelope.length;
        const envelopeCenter = Math.floor(envelopeLength / 2);

        // weigh the impact envelopes by the gaussian distribution
        const userWeightedEnvelope = weighByGaussian(userImpactEnvelope, envelopeCenter, envelopeLength);
        const referenceWeightedEnvelope = weighByGaussian(referenceImpactEnvelope, envelopeCenter, envelopeLength);
        
        // REFACTORING:: will need to support looking at adjacent segments in the future!
        
        // then compute the cross correlation of the two impact envelopes
        // this will give us a measure of how well the two envelopes align temporally
        // the peak of the cross correlation will be the temporal offset
        // between the two envelopes
        function crossCorrelate(signalA: number[], signalB: number[]): number[] {
            const result = new Array(signalA.length).fill(0);
            for (let lag = -signalA.length + 1; lag < signalA.length; lag++) {
                let sum = 0;
                for (let i = 0; i < signalA.length; i++) {
                    const j = i + lag;
                    if (j >= 0 && j < signalB.length) {
                        sum += signalA[i] * signalB[j];
                    }
                }
                result[lag + signalA.length - 1] = sum;
            }
            return result;
        }

        const crossCorrelation = crossCorrelate(userWeightedEnvelope, referenceWeightedEnvelope);

        // Find the peak of the cross-correlation to determine the temporal alignment
        const maxCorrelation = Math.max(...crossCorrelation);
        const temporalOffsetFrames = crossCorrelation.indexOf(maxCorrelation) - envelopeLength + 1;
        
        const timeOfFirstFrame = history.actualTimesInMs[0];
        const timeOfLastFrame = history.actualTimesInMs[history.actualTimesInMs.length - 1];
        const actualFrameRate = (timeOfLastFrame - timeOfFirstFrame) / (history.actualTimesInMs.length - 1);
        const temporalOffsetSecs = temporalOffsetFrames / actualFrameRate;

        return {
            temporalOffsetSecs,
        }
    }
    formatSummary(summary: Readonly<TemporalAlignmentMetricOutput>) {
        // existing output is just a number, so no formatting needed
        return summary;
    }
}
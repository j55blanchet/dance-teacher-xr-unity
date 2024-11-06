import type { Pose3DLandmarkFrame } from "$lib/webcam/mediapipe-utils";
import { getMagnitude3DVec } from "../EvaluationCommonUtils";
import type { SummaryMetric, TrackHistory } from "./MotionMetric";
let writeFileSync: typeof import('fs').writeFileSync;
let mkdirSync: typeof import('fs').mkdirSync;

if (typeof process !== 'undefined' && process.versions != null && process.versions.node != null) {
    // We are in a Node.js environment
    import('fs').then(fs => {
        writeFileSync = fs.writeFileSync;
        mkdirSync = fs.mkdirSync;
    }).catch(() => {
        writeFileSync = () => {};
        mkdirSync = () => {};
    });
} else {
    // make a no-op function if we're not in node
    writeFileSync = () => {};
    mkdirSync = () => {};
}

type TemporalAlignmentMetricOutput = ReturnType<TemporalAlignmentMetric['summarizeMetric']>;
type TemporalAlignmentMetricFormattedOutput = ReturnType<TemporalAlignmentMetric['formatSummary']>;


function calculateImpactEnvelope(frameHistory: Pose3DLandmarkFrame[], debugFileRoot?: string) {

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

    // store posegram as csv
    if (debugFileRoot) {
        const csvContent = posegram.map((frame, index) => 
            [index, ...frame].join(', ')
        ).join('\n');
        const filepath = debugFileRoot + 'posegram.csv';
        mkdirSync(debugFileRoot, { recursive: true });
        writeFileSync(filepath, csvContent, 'utf8');
    }

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

    // save the impact envelope as a csv
    if (debugFileRoot) {
        const csvContent = impactEnvelope.map((value, index) => 
            [index, value].join(', ')
        ).join('\n');
        const filepath = debugFileRoot + 'impact_envelope.csv';
        mkdirSync(debugFileRoot, { recursive: true });
        writeFileSync(filepath, csvContent, 'utf8');
    }
    
    return impactEnvelope;
}

function weighByGaussian(impactEnvelope: number[], envelopeCenterIndex: number, envelopeSegmentLength: number) {
    return impactEnvelope.map((value, index) => {
        return value * Math.exp(-Math.pow(index - envelopeCenterIndex, 2) / (2 * Math.pow(envelopeSegmentLength / 2, 2)));
    });
}

// REFACTORING:: will need to support looking at adjacent segments in the future!
export default class TemporalAlignmentMetric implements SummaryMetric<TemporalAlignmentMetricOutput, TemporalAlignmentMetricFormattedOutput> {
    summarizeMetric(
        history: TrackHistory,
        debugFilepathRoot?: string,
    ) {

        if (history.user3DFrameHistory.length !== history.ref3DFrameHistory.length) {
            throw new Error("Impact envelope calculation failed: user and reference impact envelopes are different lengths");
        }
        if (history.user3DFrameHistory.length < 2) {
            throw new Error("Impact envelope calculation failed: not enough frames to calculate impact envelope");
        }

        const userImpactEnvelope = calculateImpactEnvelope(history.user3DFrameHistory, debugFilepathRoot + "user_impact_envelope/");
        const referenceImpactEnvelope = calculateImpactEnvelope(history.ref3DFrameHistory, debugFilepathRoot + "ref_impact_envelope/");

        function saveTimeSeriesToCSV(data: number[][], filePath: string) {
            if (!debugFilepathRoot) return;
            const csvContent = data.map((value, index) => 
                [index, ...value].join(', ')
            ).join('\n');
            writeFileSync(filePath, csvContent, 'utf8');
        }

        saveTimeSeriesToCSV([userImpactEnvelope, userImpactEnvelope], debugFilepathRoot + 'impact_envelopes.csv');

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
            // Initialize the result array with zeros, the length is twice the length of signalA minus 1
            const result = new Array(signalA.length).fill(0);

            // Iterate over each possible lag (shift) value, starting from the largest possible negative lag
            // and ending at the largest possible positive lag
            //    > a lag at the middle of the result array corresponds to a perfect alignment 
            //      between the two signals
            for (let lag = -signalA.length + 1; lag < signalA.length; lag++) {
                let sum = 0;

                // For each lag, compute the sum of products of overlapping values
                for (let i = 0; i < signalA.length; i++) {
                    const j = i + lag;

                    // Ensure the index j is within the bounds of signalB
                    if (j >= 0 && j < signalB.length) {
                        sum += signalA[i] * signalB[j];
                    }
                }

                // Store the computed sum in the result array at the appropriate index
                result[lag + signalA.length - 1] = sum;
            }

            // Return the result array containing the cross-correlation values
            return result;
        }

        const crossCorrelation = crossCorrelate(userWeightedEnvelope, referenceWeightedEnvelope);

        saveTimeSeriesToCSV([crossCorrelation], debugFilepathRoot + 'cross_correlation.csv');

        // Find the peak of the cross-correlation to determine the temporal alignment
        const maxCorrelation = Math.max(...crossCorrelation);
        const indexOfMaxCorrelation = crossCorrelation.indexOf(maxCorrelation);
        const correlationCenter = Math.floor(crossCorrelation.length / 2);
        const framesToCenter = indexOfMaxCorrelation - correlationCenter;
        const temporalOffsetFrames = framesToCenter;

        
        const timeOfFirstFrame = history.actualTimesInMs[0];
        const timeOfLastFrame = history.actualTimesInMs[history.actualTimesInMs.length - 1];
        const actualFrameRate = (timeOfLastFrame - timeOfFirstFrame) / (history.actualTimesInMs.length - 1);
        const temporalOffsetSecs = temporalOffsetFrames / actualFrameRate;

        return {
            temporalOffsetSecs,
            temporalOffsetFrames,
        }
    }
    formatSummary(summary: Readonly<TemporalAlignmentMetricOutput>) {
        // existing output is just a number, so no formatting needed
        return summary;
    }
}
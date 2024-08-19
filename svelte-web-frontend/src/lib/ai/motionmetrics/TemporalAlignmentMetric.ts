import { getMagnitude3DVec } from "../EvaluationCommonUtils";
import { SummaryMetric, TrackHistory } from "./MotionMetric";

type TemporalAlignmentMetricOutput = {

}

type TemporalAlignmentMetricFormattedOutput = ReturnType<TemporalAlignmentMetric['formatSummary']>;

export default class TemporalAlignmentMetric implements SummaryMetric<TemporalAlignmentMetricOutput, TemporalAlignmentMetricFormattedOutput> {
    summarizeMetric(history: TrackHistory): TemporalAlignmentMetricOutput {

        // Step 1. Calculate pose flow -- direction that each body part is moving at each frame
        const poseFlow = history.user3DFrameHistory.map((frame, index, arr) => {
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
                const polarQuadrant = Math.floor((polarAngle + Math.PI) / (Math.PI / 4));
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
                return null;
            }
            return posegramFrame.map((binValue, binIndex) => {
                const nextBinvalue = nextPosegramFrame[binIndex];
                return nextBinvalue - binValue;
            });
        });

        // Step 4: Compute the impact envelope by summing the absolute value of prosegram flux
        const impactEnvelope = posegramFlux.reduce((acc, frame) => {
            if (!frame) {
                return acc;
            }
            return acc + frame.reduce((acc, binValue) => acc + Math.abs(binValue), 0);
        }, 0);

        // Step 5: Compute the autocorrelation of the posegram flux with that of the refernce motion
        //         to determine the overall temporal alignment.

        throw new Error("Final step o the temporal alignment calculation not yet completed.");
        // todo: refactor above into an "impact envelope calculation" function
        // todo: run the above calculation on the reference motion as well
        // todo: then compute the autocorrelation of the two impact envelopes
        // todo: find the peak of the autocorrelation to determine the temporal alignment

        const temporalOffsetSecs = 0;
        return {
            temporalOffsetSecs,
        }
    }
    formatSummary(summary: Readonly<TemporalAlignmentMetricOutput>) {
        // existing output is just a number, so no formatting needed
        return summary;
    }
}
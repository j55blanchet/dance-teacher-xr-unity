import type { LiveEvaluationMetric } from '../MotionMetric';

import type testtrack1 from './test1.group0.laxed-siren-beat.track.json';
import type testtrack2 from './test2.group0.laxed-siren-beat.track.json';
import type testtrack3 from './test3.group0.laxed-siren-beat.track.json';

export type TestTrack = typeof testtrack1 & typeof testtrack2 & typeof testtrack3;

export function runMetricOnTestTrack<T extends LiveEvaluationMetric<any, any>>(metric: T, track: TestTrack) {
    
    const metricHistory = [] as ReturnType<T['computeMetric']>[];

    for(let i = 0; i < track.user2dPoses.length; i++) {
        const user2dPose = track.user2dPoses[i];
        const user3dPose = track.user3dPoses[i];
        const ref2dPose = track.ref2dPoses[i];
        const ref3dPose = track.ref3dPoses[i];
        const videoTimeSecs = track.videoFrameTimesInSecs[i];
        const actualTimeMs = track.actualTimesInMs[i];

        const metricResult = metric.computeMetric(
            {
                videoFrameTimesInSecs: track.videoFrameTimesInSecs.slice(0, i),
                actualTimesInMs: track.actualTimesInMs.slice(0, i),
                ref2DFrameHistory: track.ref2dPoses.slice(0, i),
                ref3DFrameHistory: track.ref3dPoses.slice(0, i),
                user2DFrameHistory: track.user2dPoses.slice(0, i),
                user3DFrameHistory: track.user3dPoses.slice(0, i)
            },
            metricHistory,
            videoTimeSecs,
            actualTimeMs,
            user2dPose,
            user3dPose,
            ref2dPose,
            ref3dPose,
        );

        metricHistory.push(metricResult);
    }
    
    const summary = metric.summarizeMetric(
        {
            videoFrameTimesInSecs: track.videoFrameTimesInSecs,
            actualTimesInMs: track.actualTimesInMs,
            ref2DFrameHistory: track.ref2dPoses,
            ref3DFrameHistory: track.ref3dPoses,
            user2DFrameHistory: track.user2dPoses,
            user3DFrameHistory: track.user3dPoses
        },
        metricHistory
    ) as ReturnType<T['summarizeMetric']>;

    return {
        metricHistory, 
        summary
    };
}
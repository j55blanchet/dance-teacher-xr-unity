import type { LiveEvaluationMetric } from '../MotionMetric';
import fs from 'fs';
import path from 'path';
import testtrack1 from './badperf_alignedwithcamera.other_laxed_siren_beat.track.json'
import testtrack2 from './goodperf_alignedwithcamera.other_laxed_siren_beat.track.json';
import testtrack3 from './goodperf_skewedtocamera.other_laxed_siren_beat.track.json';
import Papa from 'papaparse';

export type TestTrack = typeof testtrack1 & typeof testtrack2 & typeof testtrack3;

export const allTestTracks: TestTrack[] = [testtrack1, testtrack2, testtrack3];

export const allTestTrackNames = allTestTracks.map((track) => track.id);


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

function ensureDirectoryExistence(dirPath: string) {
    if (fs.existsSync(dirPath)) {
      return true;
    }
    fs.mkdirSync(dirPath);
    return false;
  }

export function publishMetricOutputForTracks<T extends LiveEvaluationMetric<any, any>>(
    metric: T,
    tracks: TestTrack[],
) {
    
    const trackIds = tracks.map((track) => track.id);
    const trackDances = tracks.map((track) => track.danceRelativeStem);
    const trackSegments = tracks.map((track) => track.segmentDescription);
    const trackDescriptions = tracks.map((track) => track.trackDescription);
    const summaries = tracks.map((track) => runMetricOnTestTrack(metric, track).summary);
    const formattedSummaries = summaries.map((summary) => metric.formatSummary(summary));
    const rows = formattedSummaries.map((summary, i) => ({
        ...summary,
        dance: trackDances[i],
        trackId: trackIds[i],
        segment: trackSegments[i],
        description: trackDescriptions[i],
    }));

    const columns = [
        'trackId',
        'dance',
        'segment',
        'description',
        ...Object.keys(rows[0]).filter((key) => key !== 'dance' && key !== 'track'),
    ];

    const csv = Papa.unparse({
        fields: columns,
        data: rows,
    });
    
    ensureDirectoryExistence('./testResults');
    fs.writeFileSync(`./testResults/${metric.constructor.name}.csv`, csv);
}

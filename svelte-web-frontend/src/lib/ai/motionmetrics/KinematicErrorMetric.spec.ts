
import { describe, it } from 'vitest';
import { runSummaryMetricOnTestTrack, publishSummaryMetricOutputForTracks, loadTestTrack, generateAllTestTracks } from './testdata/metricTestingUtils';
import KinematicErrorMetric from "./KinematicErrorMetric";

// Note: we import the json file with ?url appended to the end in order to prevent degraded
//       tooling performance. If we import the json file directly, the tooling will try to
//       parse the json file as a module, which is very slow. By appending ?url, we cause the 
//       tooling to instead import the url of the json file, eliminating the need for it to parse 
//       that file during development. 
import goodperf_alignedwithcamera_url from './testdata/goodperf_alignedwithcamera.other_laxed_siren_beat.track.json?url';

describe('KinematicErrorMetric', () => {

    it('should produce expected scores for test track 1', ({ expect }) => {
        const track = loadTestTrack(goodperf_alignedwithcamera_url);
        const { summary } = runSummaryMetricOnTestTrack(
            new KinematicErrorMetric(),
            track,
        );
        
        expect(summary?.accsMAE).toMatchInlineSnapshot();
        expect(summary?.accsRSME).toMatchInlineSnapshot();
        expect(summary?.jerksMAE).toMatchInlineSnapshot();
        expect(summary?.jerksRSME).toMatchInlineSnapshot();
        expect(summary?.velsMAE).toMatchInlineSnapshot();
        expect(summary?.velsRSME).toMatchInlineSnapshot();
    });

    it('publishing metric outputs should not throw', ({ expect }) => {
        expect(() => {

            publishSummaryMetricOutputForTracks(
                new KinematicErrorMetric(),
                generateAllTestTracks(),
            )

        }).not.toThrow();
    });
});;
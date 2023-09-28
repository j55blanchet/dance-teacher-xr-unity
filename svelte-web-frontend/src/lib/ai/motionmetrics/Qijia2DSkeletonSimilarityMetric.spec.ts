import { describe, it } from 'vitest';
import { runLiveEvaluationMetricOnTestTrack, publishLiveMetricOutputForTracks, loadTestTrack, generateAllTestTracks } from './testdata/metricTestingUtils';
import { Qijia2DSkeletonSimilarityMetric } from './Qijia2DSkeletonSimilarityMetric';

// Note: we import the json file with ?url appended to the end in order to prevent degraded
//       tooling performance. If we import the json file directly, the tooling will try to
//       parse the json file as a module, which is very slow. By appending ?url, we cause the 
//       tooling to instead import the url of the json file, eliminating the need for it to parse 
//       that file during development. 
import goodperf_alignedwithcamera_url from './testdata/goodperf_alignedwithcamera.other_laxed_siren_beat.track.json?url';

describe('Qijia2DSkeletonSimilarityMetric', () => {

    it('should produce expected scores for test track 1', ({ expect }) => {
        const track = loadTestTrack(goodperf_alignedwithcamera_url);
        const { summary } = runLiveEvaluationMetricOnTestTrack(
            new Qijia2DSkeletonSimilarityMetric(),
            track,
        );
        
        expect(summary?.overallScore).toMatchInlineSnapshot(4.356392371095064);
        
        const vecScores = summary?.vectorByVectorScore;
        expect(vecScores?.get('leftShoulder -> rightShoulder')).toMatchInlineSnapshot('4.6906651077597985');
        expect(vecScores?.get('leftShoulder -> leftHip')).toMatchInlineSnapshot('4.7926083824442225');
        expect(vecScores?.get('leftHip -> rightHip')).toMatchInlineSnapshot('4.689848018675444');
        expect(vecScores?.get('rightHip -> rightShoulder')).toMatchInlineSnapshot('4.746243015495103');
        expect(vecScores?.get('leftShoulder -> leftElbow')).toMatchInlineSnapshot('3.8061246949524525');
        expect(vecScores?.get('leftElbow -> leftWrist')).toMatchInlineSnapshot('3.5868967567952272');
        expect(vecScores?.get('rightShoulder -> rightElbow')).toMatchInlineSnapshot('4.305274846896869');
        expect(vecScores?.get('rightElbow -> rightWrist')).toMatchInlineSnapshot('3.4184171877019267');
        
    });

    it('publishing metric outputs should not throw', ({ expect }) => {
        expect(() => {

            publishLiveMetricOutputForTracks(
                new Qijia2DSkeletonSimilarityMetric(),
                generateAllTestTracks(),
            )

        }).not.toThrow();
    });
});;
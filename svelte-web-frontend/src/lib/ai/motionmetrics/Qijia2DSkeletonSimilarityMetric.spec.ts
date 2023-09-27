import { describe, it } from 'vitest';
import { runMetricOnTestTrack, publishMetricOutputForTracks, allTestTracks } from './testdata/metricTestingUtils';
import { Qijia2DSkeletonSimilarityMetric } from './Qijia2DSkeletonSimilarityMetric';

import testtrack1 from './testdata/goodperf_alignedwithcamera.other_laxed_siren_beat.track.json';

describe('Qijia2DSkeletonSimilarityMetric', () => {

    it('should produce expected scores for test track 1', ({ expect }) => {
        const { summary } = runMetricOnTestTrack(
            new Qijia2DSkeletonSimilarityMetric(),
            testtrack1
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

            publishMetricOutputForTracks(
                new Qijia2DSkeletonSimilarityMetric(),
                allTestTracks,
            )

        }).not.toThrow();
    });
});;
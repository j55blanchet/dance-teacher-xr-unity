import { describe, expect, it } from 'vitest';
import { runMetricOnTestTrack } from './testdata/metricTestingUtils';
import { Qijia2DSkeletonSimilarityMetric } from './Qijia2DSkeletonSimilarityMetric';

import testtrack1 from './testdata/test1.group0.laxed-siren-beat.track.json';


describe('Qijia2DSkeletonSimilarityMetric', () => {

    it('should produce expected scores for test track 1', () => {
        const { summary } = runMetricOnTestTrack(
            new Qijia2DSkeletonSimilarityMetric(),
            testtrack1
        );
        
        expect(summary?.overallScore).toBe(4.356392371095064);
        
        const vecScores = summary?.vectorByVectorScore;
        expect(vecScores?.get('leftShoulder -> rightShoulder')).toBeCloseTo(4.726471992032173)
        expect(vecScores?.get('leftShoulder -> leftHip')).toBeCloseTo(4.7784528234946055);
        expect(vecScores?.get('leftHip -> rightHip')).toBeCloseTo(4.694387827782504);
        expect(vecScores?.get('rightHip -> rightShoulder')).toBeCloseTo(4.764385253412402);
        expect(vecScores?.get('leftShoulder -> leftElbow')).toBeCloseTo(4.311225585294475);
        expect(vecScores?.get('leftElbow -> leftWrist')).toBeCloseTo(3.8206003350799254);
        expect(vecScores?.get('rightShoulder -> rightElbow')).toBeCloseTo(4.564300766698581);
        expect(vecScores?.get('rightElbow -> rightWrist')).toBeCloseTo(3.191314384965863);
        
    });
});
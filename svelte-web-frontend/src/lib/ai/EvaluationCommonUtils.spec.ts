import { describe, it } from "vitest";
import fs from 'fs';

import * as utils from "./EvaluationCommonUtils";
import Papa from "papaparse";
import { ensureDirectoryExistence } from "./motionmetrics/testdata/metricTestingUtils";

const randomTrialCount = 40;

describe('GetVectorPNorm', () => {

    it.concurrent('should return 0 for empty vector', ({ expect }) => {
        expect(utils.GetVectorPNorm([], 2)).toBe(0);
        for (let i = 0; i < randomTrialCount; i++) {
            expect(utils.GetVectorPNorm([], Math.random() * 100)).toBe(0);
        }
    });

    it.concurrent('should be equal to manhattan dist for 1-norm', ({ expect }) => {
        expect(utils.GetVectorPNorm([3, 4], 1)).toBe(7);
        expect(utils.GetVectorPNorm([3, 4, 5], 1)).toBe(12);
        expect(utils.GetVectorPNorm([1, 1], 1)).toBe(2);
        expect(utils.GetVectorPNorm([1, 1, 1], 1)).toBe(3);

    });

    it.concurrent('should work for 2-norm', ({ expect }) => {
        expect(utils.GetVectorPNorm([3, 4], 2)).toBe(5);
        expect(utils.GetVectorPNorm([3, 4, 5], 2)).toBe(Math.sqrt(50));
        expect(utils.GetVectorPNorm([1, 1], 2)).toBe(Math.sqrt(2));
        expect(utils.GetVectorPNorm([1, 1, 1], 2)).toBe(Math.sqrt(3));
        
        for(let i = 0; i < randomTrialCount; i++) {
            const rand = Math.random() * 100;
            expect(utils.GetVectorPNorm([rand], 2)).toBe(rand);
        }
    });

    it.concurrent('should return near max for near infinity norm', ({ expect }) => {
        const highNorm = 250;
        expect(utils.GetVectorPNorm([3, 4], highNorm)).toBeCloseTo(4);
        expect(utils.GetVectorPNorm([3, 4, 5], highNorm)).toBeCloseTo(5);
        expect(utils.GetVectorPNorm([1, 1], highNorm)).toBeCloseTo(1);
        expect(utils.GetVectorPNorm([1, 1, 1], highNorm)).toBeCloseTo(1);
        
        for(let i = 0; i < randomTrialCount; i++) {
            const highNorm2 = 130;
            const rand1 = 1.5 + Math.random() * 100;
            const rand2 = 1.5 + Math.random() * 100;
            const maxVal = Math.max(rand1, rand2)
            const pnorm = utils.GetVectorPNorm([rand1, rand2], highNorm2);
            const difference = Math.abs(maxVal - pnorm);
            expect(difference, `i:${i} rand1: ${rand1}, rand2:${rand2}`).toBeLessThan(1.0);
        }
    });
});


describe('MeanComparisons', () => {
    it.concurrent('should output vector norms', ( { expect }) => {
        
        function makeRandomVector(count: number, min: number, max: number) {
            return new Array(count).fill(0).map(() => min + Math.random() * (max - min));
        }

        const testVectors = [
            [1, 1],
            [1, 2, 1, 9, 10],
            [-78, -21, 50, 100],
            [1, 1, 1, 1, 1, 1, 10],
            [2, 10, 10, 10, 10, 10, 10, 10],
            [0.9, 0.9, 0.9, 0.4],
            makeRandomVector(5, 0, 100),
            makeRandomVector(5, 0, 100),
            makeRandomVector(5, 0, 100),
            makeRandomVector(5, -100, 0),
            makeRandomVector(5, -100, 0),
            makeRandomVector(5, -100, 0),
        ];

        const data: Record<string, (number | string)>[] = []

        for(const vector of testVectors) { 
            data.push({
                vectors: vector.toSorted().map(x => x.toFixed(2)).join(','),
                mins: Math.min(...vector),
                negInfNorms: utils.GetVectorPNormAverage(vector, -Infinity),
                neg100Norms: utils.GetVectorPNormAverage(vector, -100),
                neg2Norms: utils.GetVectorPNormAverage(vector, -2),
                neg1Norms: utils.GetVectorPNormAverage(vector, -1),
                harmonicMeans: utils.GetHarmonicMean(vector),
                negAlmostZeroNorms: utils.GetVectorPNormAverage(vector, -0.05),
                geometricMeans: utils.GetGeometricMean(vector),
                posAlmostZeroNorms: utils.GetVectorPNormAverage(vector, 0.05),
                oneNorms: utils.GetVectorPNormAverage(vector, 1),
                arithmeticMeans: utils.GetArithmeticMean(vector),
                twoNorms: utils.GetVectorPNormAverage(vector, 2),
                pos100Norms: utils.GetVectorPNormAverage(vector, 100),
                posInfNorms: utils.GetVectorPNormAverage(vector, Infinity),
                maxes: Math.max(...vector),
            });
        }

        const csv = Papa.unparse({
            fields: Object.keys(data[0]),
            data: data
        });

        
        expect(() => {
            ensureDirectoryExistence('./testResults/');
            fs.writeFileSync(`./testResults/normAverages.csv`, csv);
        }).not.toThrow();
    });
});
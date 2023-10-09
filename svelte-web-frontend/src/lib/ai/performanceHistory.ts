import type { BaseMetric } from "./motionmetrics/MotionMetric";

import { writable, derived } from 'svelte/store';

export type DanceSegmentPerformanceHistory<MetricTypes extends Record<string, BaseMetric<any, any>>> = {
    [K in keyof MetricTypes]?: Array<{
        date: Date,
        partOfLargerPerformance?: boolean,
        summary: Partial<ReturnType<MetricTypes[K]["formatSummary"]>>
    }>
}

export type DancePerformanceHistory<MetricTypes extends Record<string, BaseMetric<any, any>>> = {
    [segmentId: string]: DanceSegmentPerformanceHistory<MetricTypes>
}

export type CompletePerformanceHistory<MetricTypes extends Record<string, BaseMetric<any, any>>> = {
    [danceRelativeStem: string]: DancePerformanceHistory<MetricTypes>
}

function loadPerformanceHistoryFromLocalstorage<MetricTypes extends Record<string, BaseMetric<any, any>>>() {
    const history = localStorage.getItem("performanceHistory");
    if (history) {
        const data = JSON.parse(history) as CompletePerformanceHistory<MetricTypes>;
        // now, un-serialize the dates
        for (const danceRelativeStem of Object.keys(data)) {
            for (const segmentId of Object.keys(data[danceRelativeStem])) {
                for (const metricName of Object.keys(data[danceRelativeStem][segmentId])) {
                    for (const attempt of data?.[danceRelativeStem]?.[segmentId]?.[metricName] ?? []) {
                        attempt.date = new Date(attempt.date);
                    }
                }
            }
        }
        return data;
    } else {
        return {} as CompletePerformanceHistory<MetricTypes>;
    }
}

export function createPerformanceHistoryStore<MetricTypes extends Record<string, BaseMetric<any, any>>>() {
	const { subscribe, update } = writable(loadPerformanceHistoryFromLocalstorage() as CompletePerformanceHistory<MetricTypes>);

	return {
		subscribe,
        recordPerformance<MetricKey extends keyof MetricTypes, SummaryFormat extends ReturnType<MetricTypes[MetricKey]["formatSummary"]>>(
            danceRelativeStem: string, 
            segment: string, 
            metricName: MetricKey, 
            performance: Partial<SummaryFormat>,
            partOfLargerPerformance: boolean,
        ) {


            update((history) => {
                history[danceRelativeStem] = history[danceRelativeStem] ?? {};
                history[danceRelativeStem][segment] = history[danceRelativeStem][segment] ?? {};
                history[danceRelativeStem][segment][metricName] = history[danceRelativeStem][segment][metricName] ?? [];
    
                history[danceRelativeStem][segment][metricName]?.push({
                    date: new Date(),
                    partOfLargerPerformance,
                    summary: performance,
                })

                localStorage.setItem("performanceHistory", JSON.stringify(history));

                // console.log(`Recorded performance for dance ${danceRelativeStem}, segment ${segment}, metric ${String(metricName)}`, performance);
                return history;
            });


        },
        getDanceSegmentPerformanceHistory<T extends keyof MetricTypes>(danceRelativeStem: string, metricName: T, segment: string) {
            return derived(this, ($history) => {
                return $history?.[danceRelativeStem]?.[segment]?.[metricName] ?? [];
            });
        },
        lastNAttempts<T extends keyof MetricTypes>(danceRelativeStem: string, metricName: T, n: number) {
            return derived(this, ($history) => {
                if (!$history) return [];
                const danceHistory = $history[danceRelativeStem] ?? {};
                const allSegments = Object.keys(danceHistory) as string[];
                // let attempts: DanceSegmentPerformanceHistory<MetricTypes>[T] = []
                // for (const segment of allSegments) {
                //     const segmentAttempts = danceHistory[segment]?.[metricName] ?? [];
                //     const attemptsNotPartOfLargerPerformance = segmentAttempts.filter((attempt) => !(attempt.partOfLargerPerformance ?? true));
                //     attempts = attempts.concat(attemptsNotPartOfLargerPerformance);
                // }
                const attempts = allSegments.flatMap((segment) => {
                
                    const segmentAttempts = danceHistory[segment]?.[metricName] ?? [];
                    const attemptsNotPartOfLargerPerformance = segmentAttempts.filter((attempt) => !(attempt.partOfLargerPerformance ?? true));
                    const attemptsNotPartOfLargerPerformanceWithSegment = attemptsNotPartOfLargerPerformance.map((attempt) => ({
                        ...attempt,
                        segmentId: segment,
                    }));
                    return attemptsNotPartOfLargerPerformanceWithSegment;
                });

                // Sort attempts - most recent first
                attempts.sort((a, b) => b.date.getTime() - a.date.getTime());
                return attempts.slice(-n);
            });
        }
	};
}

export type PerformanceHistoryStore<MetricTypes extends Record<string, BaseMetric<any, any>>> = ReturnType<typeof createPerformanceHistoryStore<MetricTypes>>
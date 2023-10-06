import type { BaseMetric } from "./motionmetrics/MotionMetric";

import { writable, derived } from 'svelte/store';

export type DanceSegmentPerformanceHistory<MetricTypes extends Record<string, BaseMetric<any>>> = {
    [K in keyof MetricTypes]?: Array<{
        date: Date,
        summary: Partial<ReturnType<MetricTypes[K]["formatSummary"]>>
    }>
}

export type DancePerformanceHistory<MetricTypes extends Record<string, BaseMetric<any>>> = {
    [segmentId: string]: DanceSegmentPerformanceHistory<MetricTypes>
}

export function createPerformanceHistoryStore<MetricTypes extends Record<string, BaseMetric<any>>>() {
	const { subscribe, update } = writable({} as Record<string, DancePerformanceHistory<MetricTypes>>);

	return {
		subscribe,
        recordPerformance<MetricKey extends keyof MetricTypes, SummaryFormat extends ReturnType<MetricTypes[MetricKey]["formatSummary"]>>(
            danceRelativeStem: string, 
            segment: string, 
            metricName: MetricKey, 
            performance: Partial<SummaryFormat> 
        ) {
            update((history) => {
                history[danceRelativeStem] = history[danceRelativeStem] ?? {};
                history[danceRelativeStem][segment] = history[danceRelativeStem][segment] ?? {};
                history[danceRelativeStem][segment][metricName] = history[danceRelativeStem][segment][metricName] ?? [];
    
                history[danceRelativeStem][segment][metricName]?.push({
                    date: new Date(),
                    summary: performance,
                })

                // console.log(`Recorded performance for dance ${danceRelativeStem}, segment ${segment}, metric ${String(metricName)}`, performance);
                return history;
            });
        },
        getDanceSegmentPerformanceHistory<T extends keyof MetricTypes>(danceRelativeStem: string, metricName: T, segment: string) {
            return derived(this, ($history) => {
                return $history[danceRelativeStem]?.[segment]?.[metricName] ?? [];
            });
        },
	};
}

export type PerformanceHistoryStore<MetricTypes extends Record<string, BaseMetric<any>>> = ReturnType<typeof createPerformanceHistoryStore<MetricTypes>>
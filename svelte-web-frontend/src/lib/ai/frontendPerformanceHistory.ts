import type { FrontendMetrics } from "./FrontendDanceEvaluator";
import { createPerformanceHistoryStore } from "./performanceHistory";

export default createPerformanceHistoryStore<typeof FrontendMetrics>();
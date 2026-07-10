import type { AgentFailureReason, AgentName } from "./agentErrors";

export type AgentMetricPhase =
    | "bedrock_start"
    | "bedrock_success"
    | "bedrock_error"
    | "parse_success"
    | "parse_error"
    | "fallback"
    | "validation";

export interface AgentMetric {
    agent: AgentName;
    phase: AgentMetricPhase;
    traceId: string;
    ts: number;
    durationMs?: number;
    reason?: AgentFailureReason;
    attempt?: number;
    status?: number;
    inputCount?: number;
    outputCount?: number;
    invalidIdsDropped?: number;
    invalidOutfitsDropped?: number;
    meta?: Record<string, unknown>;
}

const metrics: AgentMetric[] = [];

/**
 * Running KPI tally (per-agent total/fallback + parse errors) accumulated as metrics are recorded.
 * Drained by the app layer and flushed to Firestore so fallback rate is observable in production.
 * Kept here (no Firebase import) so the agents layer stays decoupled from persistence.
 */
const metricTally: Record<string, number> = {};

function bumpTally(key: string): void {
    metricTally[key] = (metricTally[key] ?? 0) + 1;
}

/** Return the accumulated counters since the last drain and reset them. */
export function drainAgentMetricTally(): Record<string, number> {
    const drained = { ...metricTally };
    for (const key of Object.keys(metricTally)) delete metricTally[key];
    return drained;
}

type BrowserAgentMetrics = {
    events: () => AgentMetric[];
    summary: () => ReturnType<typeof getAgentMetricSummary>;
    clear: () => void;
};

const browserMetrics = (): { __WARDROBE_AGENT_METRICS__?: BrowserAgentMetrics } | null => {
    if (typeof window === "undefined") return null;
    return window as unknown as { __WARDROBE_AGENT_METRICS__?: BrowserAgentMetrics };
};

export function createAgentTraceId(agent: AgentName): string {
    const randomPart = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
    return `${agent}-${Date.now()}-${randomPart}`;
}

export function recordAgentMetric(metric: Omit<AgentMetric, "ts">): AgentMetric {
    const fullMetric: AgentMetric = { ...metric, ts: Date.now() };
    metrics.push(fullMetric);

    // Accumulate the KPI tally: one "total" per terminal agent outcome, plus fallback / parse-error counts.
    if (metric.phase === "fallback") {
        bumpTally(`${metric.agent}Fallback`);
        bumpTally(`${metric.agent}Total`);
    } else if (metric.phase === "parse_success" || metric.phase === "validation") {
        bumpTally(`${metric.agent}Total`);
    }
    if (metric.reason === "parse_error") bumpTally("parseErrors");

    return fullMetric;
}

export function getAgentMetrics(): AgentMetric[] {
    return [...metrics];
}

export function getAgentMetricSummary(): {
    total: number;
    fallbackCount: number;
    parseErrorCount: number;
    byAgent: Record<AgentName, number>;
    byReason: Partial<Record<AgentFailureReason, number>>;
} {
    return metrics.reduce((summary, metric) => {
        summary.total += 1;
        summary.byAgent[metric.agent] = (summary.byAgent[metric.agent] ?? 0) + 1;
        if (metric.phase === "fallback") summary.fallbackCount += 1;
        if (metric.reason === "parse_error") summary.parseErrorCount += 1;
        if (metric.reason) {
            summary.byReason[metric.reason] = (summary.byReason[metric.reason] ?? 0) + 1;
        }
        return summary;
    }, {
        total: 0,
        fallbackCount: 0,
        parseErrorCount: 0,
        byAgent: { intake: 0, stylist: 0, behavioral: 0, bedrock: 0 },
        byReason: {},
    } as {
        total: number;
        fallbackCount: number;
        parseErrorCount: number;
        byAgent: Record<AgentName, number>;
        byReason: Partial<Record<AgentFailureReason, number>>;
    });
}

export function clearAgentMetrics(): void {
    metrics.length = 0;
}

const target = browserMetrics();
if (target) {
    target.__WARDROBE_AGENT_METRICS__ = {
        events: getAgentMetrics,
        summary: getAgentMetricSummary,
        clear: clearAgentMetrics,
    };
}

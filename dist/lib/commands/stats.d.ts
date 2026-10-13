/**
 * DCP Stats command handler.
 * Shows pruning statistics for the current session and all-time totals.
 */
import type { Logger } from "../logger";
import type { SessionState, WithParts } from "../state";
import { type AggregatedStats } from "../state/persistence";
export interface StatsCommandContext {
    client: any;
    state: SessionState;
    logger: Logger;
    sessionId: string;
    messages: WithParts[];
}
export declare function formatStatsMessage(sessionTokens: number, sessionSummaryTokens: number, sessionTools: number, sessionMessages: number, sessionDurationMs: number, allTime: AggregatedStats): string;
export declare function handleStatsCommand(ctx: StatsCommandContext): Promise<void>;
export declare function buildStatsReport(state: SessionState, logger: Logger): Promise<{
    sessionTokens: number;
    sessionSummaryTokens: number;
    sessionTools: number;
    sessionMessages: number;
    sessionDurationMs: number;
    allTime: AggregatedStats;
}>;
//# sourceMappingURL=stats.d.ts.map
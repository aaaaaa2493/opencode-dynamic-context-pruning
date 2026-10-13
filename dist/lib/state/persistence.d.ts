/**
 * State persistence module for DCP plugin.
 * Persists pruned tool IDs across sessions so they survive OpenCode restarts.
 * Storage location: ~/.local/share/opencode/storage/plugin/dcp/{sessionId}.json
 */
import type { CompressionBlock, PrunedMessageEntry, SessionState, SessionStats } from "./types";
import type { Logger } from "../logger";
/** Prune state as stored on disk */
export interface PersistedPruneMessagesState {
    byMessageId: Record<string, PrunedMessageEntry>;
    blocksById: Record<string, CompressionBlock>;
    activeBlockIds: number[];
    activeByAnchorMessageId: Record<string, number>;
    nextBlockId: number;
    nextRunId: number;
}
export interface PersistedPrune {
    tools?: Record<string, number>;
    messages?: PersistedPruneMessagesState;
}
export interface PersistedNudges {
    contextLimitAnchors: string[];
    turnNudgeAnchors?: string[];
    iterationNudgeAnchors?: string[];
}
export interface PersistedSessionState {
    sessionName?: string;
    manualMode?: boolean;
    prune: PersistedPrune;
    nudges: PersistedNudges;
    stats: SessionStats;
    lastUpdated: string;
}
export declare function saveSessionState(sessionState: SessionState, logger: Logger, sessionName?: string, strict?: boolean): Promise<void>;
export declare function loadSessionState(sessionId: string, logger: Logger): Promise<PersistedSessionState | null>;
export declare function loadManualModeSetting(sessionId: string, logger: Logger): Promise<boolean | undefined>;
export declare function saveManualModeSetting(sessionId: string, manualMode: boolean, logger: Logger): Promise<void>;
export interface AggregatedStats {
    totalTokens: number;
    totalTools: number;
    totalMessages: number;
    sessionCount: number;
}
export declare function loadAllSessionStats(logger: Logger): Promise<AggregatedStats>;
//# sourceMappingURL=persistence.d.ts.map
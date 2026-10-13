import type { PruneMessagesState, SessionState } from "../state";
import { type IdFormat } from "../message-ids";
import type { AppliedCompressionResult, CompressionStateInput, SelectionResolution } from "./types";
export declare const COMPRESSED_BLOCK_HEADER = "[Compressed conversation section]";
export declare function allocateBlockId(state: SessionState): number;
export declare function allocateRunId(state: SessionState): number;
export declare function attachCompressionDuration(messagesState: PruneMessagesState, messageId: string, callId: string, durationMs: number): number;
export declare function wrapCompressedSummary(blockId: number, summary: string, format?: IdFormat): string;
export declare function applyCompressionState(state: SessionState, input: CompressionStateInput, selection: SelectionResolution, anchorMessageId: string, blockId: number, summary: string, consumedBlockIds: number[]): AppliedCompressionResult;
//# sourceMappingURL=state.d.ts.map
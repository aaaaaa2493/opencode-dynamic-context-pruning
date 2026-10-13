import type { CompressionBlock, SessionState } from "../state";
import type { IdFormat } from "../message-ids";
import type { BoundaryReference, CompressRangeToolArgs, InjectedSummaryResult, ParsedBlockPlaceholder, ResolvedRangeCompression, SearchContext } from "./types";
export declare function validateArgs(args: CompressRangeToolArgs): void;
export declare function resolveRanges(args: CompressRangeToolArgs, searchContext: SearchContext, state: SessionState): ResolvedRangeCompression[];
export declare function validateNonOverlapping(plans: ResolvedRangeCompression[]): void;
export declare function parseBlockPlaceholders(summary: string, format?: IdFormat): ParsedBlockPlaceholder[];
export declare function validateSummaryPlaceholders(placeholders: ParsedBlockPlaceholder[], requiredBlockIds: number[], startReference: BoundaryReference, endReference: BoundaryReference, summaryByBlockId: Map<number, CompressionBlock>): number[];
export declare function injectBlockPlaceholders(summary: string, placeholders: ParsedBlockPlaceholder[], summaryByBlockId: Map<number, CompressionBlock>, startReference: BoundaryReference, endReference: BoundaryReference): InjectedSummaryResult;
export declare function appendMissingBlockSummaries(summary: string, missingBlockIds: number[], summaryByBlockId: Map<number, CompressionBlock>, consumedBlockIds: number[], format?: IdFormat): InjectedSummaryResult;
//# sourceMappingURL=range-utils.d.ts.map
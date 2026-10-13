import type { SessionState, WithParts } from "./state";
export type IdFormat = "xml" | "compact";
export declare const MESSAGE_REF_MAX_INDEX = 9999;
export type ParsedBoundaryId = {
    kind: "message";
    ref: string;
    index: number;
} | {
    kind: "compressed-block";
    ref: string;
    blockId: number;
};
export declare function formatMessageRef(index: number, format?: IdFormat): string;
export declare function formatBlockRef(blockId: number, format?: IdFormat): string;
export declare function parseMessageRef(ref: string, format?: IdFormat): number | null;
export declare function parseBlockRef(ref: string, format?: IdFormat): number | null;
export declare function parseBoundaryId(id: string, format?: IdFormat): ParsedBoundaryId | null;
export declare function formatMessageIdTag(ref: string, attributes?: Record<string, string | undefined>, format?: IdFormat): string;
export declare function assignMessageRefs(state: SessionState, messages: WithParts[]): number;
//# sourceMappingURL=message-ids.d.ts.map
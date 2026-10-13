import type { SessionState, WithParts } from "../state";
import type { IdFormat } from "../message-ids";
export declare const createSyntheticUserMessage: (baseMessage: WithParts, content: string, stableSeed?: string) => WithParts;
export declare const createSyntheticTextPart: (baseMessage: WithParts, content: string, stableSeed?: string) => {
    id: string;
    sessionID: string;
    messageID: string;
    type: "text";
    text: string;
};
type MessagePart = WithParts["parts"][number];
type ToolPart = Extract<MessagePart, {
    type: "tool";
}>;
type TextPart = Extract<MessagePart, {
    type: "text";
}>;
export declare const appendToLastTextPart: (message: WithParts, injection: string) => boolean;
export declare const appendToTextPart: (part: TextPart, injection: string) => boolean;
export declare const appendToAllToolParts: (message: WithParts, tag: string) => boolean;
export declare const appendToToolPart: (part: ToolPart, tag: string) => boolean;
export declare const hasContent: (message: WithParts) => boolean;
export declare function buildToolIdList(state: SessionState, messages: WithParts[]): string[];
export declare const replaceBlockIdsWithBlocked: (text: string, format?: IdFormat) => string;
export declare const stripHallucinationsFromString: (text: string, format?: IdFormat) => string;
export declare const stripHallucinations: (messages: WithParts[], format?: IdFormat) => void;
export {};
//# sourceMappingURL=utils.d.ts.map
import type { SessionState, WithParts } from "../../state";
import type { PluginConfig } from "../../config";
import type { RuntimePrompts } from "../../prompts/store";
import { type CompressionPriorityMap } from "../priority";
export interface LastUserModelContext {
    providerId: string | undefined;
    modelId: string | undefined;
}
export interface LastNonIgnoredMessage {
    message: WithParts;
    index: number;
}
export declare function getNudgeFrequency(config: PluginConfig): number;
export declare function getIterationNudgeThreshold(config: PluginConfig): number;
export declare function findLastNonIgnoredMessage(messages: WithParts[]): LastNonIgnoredMessage | null;
export declare function countMessagesAfterIndex(messages: WithParts[], index: number): number;
export declare function getModelInfo(messages: WithParts[]): LastUserModelContext;
export declare function isContextOverLimits(config: PluginConfig, state: SessionState, providerId: string | undefined, modelId: string | undefined, messages: WithParts[]): {
    overMaxLimit: boolean;
    overMinLimit: boolean;
};
export declare function addAnchor(anchorMessageIds: Set<string>, anchorMessageId: string, anchorMessageIndex: number, messages: WithParts[], interval: number): boolean;
export declare function applyAnchoredNudges(state: SessionState, config: PluginConfig, messages: WithParts[], prompts: RuntimePrompts, compressionPriorities?: CompressionPriorityMap): void;
//# sourceMappingURL=utils.d.ts.map
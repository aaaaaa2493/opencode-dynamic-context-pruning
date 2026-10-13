import type { SessionState, WithParts } from "../../state";
import type { Logger } from "../../logger";
import type { PluginConfig } from "../../config";
import type { RuntimePrompts } from "../../prompts/store";
import type { CompressionPriorityMap } from "../priority";
export declare const injectCompressNudges: (state: SessionState, config: PluginConfig, logger: Logger, messages: WithParts[], prompts: RuntimePrompts, compressionPriorities?: CompressionPriorityMap, createAnchors?: boolean) => void;
export declare const injectMessageIds: (state: SessionState, config: PluginConfig, messages: WithParts[], compressionPriorities?: CompressionPriorityMap) => void;
//# sourceMappingURL=inject.d.ts.map
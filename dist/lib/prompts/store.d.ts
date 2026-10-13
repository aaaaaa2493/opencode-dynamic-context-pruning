import type { Logger } from "../logger";
import type { IdFormat } from "../message-ids";
export type PromptKey = "system" | "compress-range" | "compress-message" | "context-limit-nudge" | "turn-nudge" | "iteration-nudge";
export interface RuntimePrompts {
    system: string;
    compressRange: string;
    compressMessage: string;
    contextLimitNudge: string;
    turnNudge: string;
    iterationNudge: string;
    manualExtension: string;
    subagentExtension: string;
}
export declare const PROMPT_KEYS: PromptKey[];
export declare class PromptStore {
    private readonly logger;
    private readonly paths;
    private readonly customPromptsEnabled;
    private runtimePrompts;
    private readonly bundled;
    constructor(logger: Logger, workingDirectory: string, customPromptsEnabled?: boolean, idFormat?: IdFormat);
    getRuntimePrompts(): RuntimePrompts;
    reload(): void;
    private getOverrideCandidates;
    private ensureDefaultFiles;
}
//# sourceMappingURL=store.d.ts.map
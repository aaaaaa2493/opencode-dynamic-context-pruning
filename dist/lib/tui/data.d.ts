import { type PluginConfig } from "../config";
import { Logger } from "../logger";
import { type SessionState, type WithParts } from "../state";
import type { TuiApi } from "./types";
export declare const logger: Logger;
export declare function loadConfig(api: TuiApi): PluginConfig;
export declare function activeSessionID(api: TuiApi): string | undefined;
export declare function sessionMessages(api: TuiApi, sessionID: string): WithParts[];
export declare function buildSessionState(sessionID: string, messages: WithParts[], config: PluginConfig): Promise<SessionState>;
export declare function loadSessionData(api: TuiApi, config: PluginConfig): Promise<{
    state: SessionState;
    messages: WithParts[];
} | undefined>;
//# sourceMappingURL=data.d.ts.map
import type { Message } from "@opencode/ai/schema/messages";
import type { Plugin } from "@opencode/plugin";
import type { WithParts } from "../state";
type History = Awaited<ReturnType<Plugin.Context["session"]["context"]>>;
type Session = Awaited<ReturnType<Plugin.Context["session"]["get"]>>;
export declare function history(entries: History, session: Session): WithParts[];
export declare function project(native: Message[], entries: History, session: Session): {
    messages: WithParts[];
    restore: () => Message[];
    summaryBase: WithParts;
};
export {};
//# sourceMappingURL=messages.d.ts.map
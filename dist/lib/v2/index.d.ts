import type { Plugin } from "@opencode/plugin";
import { Logger } from "../logger";
export declare function report(logger: Logger, text: string, sessionID?: string): Promise<void>;
export declare function setup(ctx: Plugin.Context): Promise<(() => void) | undefined>;
//# sourceMappingURL=index.d.ts.map
/** @jsxImportSource @opentui/solid */
import type { analyzeContextTokens } from "../commands/context";
import type { StatsReport, ViewApi } from "./types";
export declare function StatusDialog(props: {
    api: ViewApi;
    title: string;
    eyebrow: string;
    message: string;
}): any;
export declare function ContextDialog(props: {
    api: ViewApi;
    breakdown: ReturnType<typeof analyzeContextTokens>;
    onBack: () => void;
}): any;
export declare function StatsDialog(props: {
    api: ViewApi;
    report: StatsReport;
    onBack: () => void;
}): any;
export declare function PanelDialog(props: {
    api: ViewApi;
    manualMode: boolean;
    canCompress: boolean;
    blockedReason?: string;
    onContext: () => void;
    onStats: () => void;
    onManual: (enabled: boolean) => void;
}): any;
//# sourceMappingURL=dialogs.d.ts.map
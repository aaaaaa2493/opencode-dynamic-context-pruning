/** @jsxImportSource @opentui/solid */
import type { PluginConfig } from "../config";
import type { TuiApi } from "./types";
export declare function showDialog(api: TuiApi, render: () => any): void;
export declare function showStatusDialog(api: TuiApi, title: string, eyebrow: string, message: string): void;
export declare function showError(api: TuiApi, title: string, error: unknown): void;
export declare function openContextModal(api: TuiApi, config: PluginConfig): void;
export declare function openStatsModal(api: TuiApi, config: PluginConfig): void;
export declare function openPanelModal(api: TuiApi, config: PluginConfig): void;
//# sourceMappingURL=modals.d.ts.map
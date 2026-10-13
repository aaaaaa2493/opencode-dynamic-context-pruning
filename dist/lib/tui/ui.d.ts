/** @jsxImportSource @opentui/solid */
import type { JSX } from "solid-js";
import type { Theme, ThemeColor, ViewApi } from "./types";
export declare function DcpFrame(props: {
    api: ViewApi;
    title?: string;
    eyebrow: string;
    children: JSX.Element;
    onBack?: () => void;
}): any;
export declare function Card(props: {
    theme: Theme;
    title: string;
    children: JSX.Element;
}): any;
export declare function Metric(props: {
    theme: Theme;
    label: string;
    value: string;
    hint?: string;
}): any;
export declare function Progress(props: {
    theme: Theme;
    label: string;
    value: number;
    total: number;
    color: ThemeColor;
    detail: string;
}): any;
export declare function PromptRow(props: {
    theme: Theme;
    command: string;
    description: string;
    accent?: ThemeColor;
}): any;
export declare function StatusPill(props: {
    theme: Theme;
    label: string;
    value: string;
    accent: ThemeColor;
}): any;
export declare function ActionRow(props: {
    theme: Theme;
    title: string;
    detail: string;
    onClick: () => void;
}): any;
//# sourceMappingURL=ui.d.ts.map
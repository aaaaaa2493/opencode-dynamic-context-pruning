import type { Theme } from "../tui/types";
type Color = Theme["text"];
type Feedback = "success" | "warning" | "error";
type Action = "primary" | "secondary";
type CurrentTheme = {
    surface(name: "dialog"): {
        text: {
            base: Color;
            muted: Color;
            action: Record<Action, {
                base: Color;
            }>;
            feedback: Record<Feedback, {
                base: Color;
            }>;
        };
        background: {
            base: Color;
            raised: {
                base: Color;
            };
        };
        border: {
            base: Color;
        };
    };
};
type EarlierTheme = {
    contextual: {
        overlay: {
            text: {
                default: Color;
                subdued: Color;
                action: Record<Action, {
                    default: Color;
                }>;
                feedback: Record<Feedback, {
                    default: Color;
                }>;
            };
            background: {
                default: Color;
                surface: {
                    offset: Color;
                };
            };
            border: {
                default: Color;
            };
        };
    };
};
export declare function panelTheme(source: CurrentTheme | EarlierTheme): Theme;
export {};
//# sourceMappingURL=theme.d.ts.map
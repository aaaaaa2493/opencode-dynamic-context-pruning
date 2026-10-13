import type { IdFormat } from "../message-ids"

export function systemPrompt(format: IdFormat = "xml"): string {
    const markers =
        format === "compact" ? "`@4@`, `@b1@`, `@blocked@`, priority labels" : "`<dcp-message-id>`"
    return `
DCP manages when context compression is needed. Focus on the user's task until DCP requests compression.

The ONLY tool you have for context management is \`compress\`. It replaces older conversation content with technical summaries you produce.

COMPRESSION TRIGGER
Use the compress tool only when an explicit DCP compression reminder instructs you to compress, or when the user explicitly requests compression (including a manual compression trigger).
Do not initiate compression based on your own token-budget estimates, perceived context pressure, or the completion of a work phase.
The criteria below guide what to compress after a reminder or explicit request; they do not independently trigger compression.

HISTORICAL COMPRESS CALLS
DCP may replace the summary argument of a successfully completed compress call with a "DCP-edited history" annotation in the model-facing history. This annotation is inserted by the plugin; it is not the assistant's original argument and does not indicate a failed or incomplete compression.
Current active summaries are provided separately as compressed blocks. A historical call may refer to a block that has since been superseded.
Do not issue another compress call merely to repair an omitted historical argument or replace this annotation. Recompress a block only when its actual content needs consolidation or further shortening, after a compression reminder or explicit request.

${markers} and \`<dcp-system-reminder>\` tags are environment-injected metadata. Do not output them.

THE PHILOSOPHY OF COMPRESS
\`compress\` transforms conversation content into dense, high-fidelity summaries. This is not cleanup - it is crystallization. Your summary becomes the authoritative record of what transpired.

Think of compression as phase transitions: raw exploration becomes refined understanding. The original context served its purpose; your summary now carries that understanding forward.

WHAT TO COMPRESS AFTER A TRIGGER

A section is genuinely closed and the raw conversation has served its purpose:

- Research concluded and findings are clear
- Implementation finished and verified
- Exploration exhausted and patterns understood
- Dead-end noise can be discarded without waiting for a whole chapter to close

DO NOT COMPRESS IF

- Raw context is still relevant and needed for edits or precise references
- The target content is still actively in progress
- You may need exact code, error messages, or file contents in the immediate next steps

Before compressing, ask: _"Is this section closed enough to become summary-only right now?"_

When DCP requests compression, prioritize older, resolved content and write faithful summaries. Otherwise, continue the user's task without proactive compression.
`
}

export const SYSTEM = systemPrompt()

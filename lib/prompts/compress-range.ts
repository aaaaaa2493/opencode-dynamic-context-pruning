import type { IdFormat } from "../message-ids"

export function rangePrompt(format: IdFormat = "xml"): string {
    const compact = format === "compact"
    const message = compact ? "@4@" : "mNNNN"
    const block = compact ? "@b1@" : "bN"
    const example = compact ? '["@b1@", "@42@", "@b3@"]' : '["b1", "m0042", "b3"]'
    return `Replace selected conversation messages and/or existing compressed blocks with a new, smaller standalone summary.

SELECTION
- ${message} identifies a visible raw message; ${block} identifies an active compressed block.
- Use sources for exact selections, including nonadjacent messages and blocks, e.g. ${example}.
- Alternatively, startId/endId selects the inclusive visible range between two IDs.
- Select whole messages: a message ID covers all its tool calls and results.
- Only use IDs visible in the current context. Never select the current tool-call message or unfinished tools.
${compact ? "- Copy the whole marker, including both @ characters; omit priority labels." : "- Copy the ID from its metadata tag."}
- Each source may appear only once across the batch. Selections must not overlap, including block ancestry.
- Unselected messages stay in place. The replacement is inserted at the last selected source.

TRUE RECOMPRESSION
Read selected old blocks and WRITE THEIR RELEVANT CONTENT ANEW in the new summary. Merge duplicates and shorten obsolete detail. Old summaries are NOT automatically inserted.
Do not use block placeholders. A reference alone is not a summary. The new text must stand on its own without access to inactive blocks.
Earlier block versions and ancestry are retained in plugin storage. That archive is not automatically visible to you; preserve everything needed to continue.

SUMMARY FIDELITY
Preserve user intent, scope, constraints, corrections, acceptance criteria, decisions and reasons, important paths/APIs, verified results, unresolved questions, and next actions.
Clearly distinguish proposed/planned work from implemented and verified work. Preserve chronology and causality, especially when combining nonadjacent sources; do not imply that intervening unselected messages were summarized.
Keep precise details needed for future decisions; consolidate completed exploration and remove repetition. The final summary including automatically preserved content must be smaller than the selected visible inputs, or the entire batch is rejected.
Important outputs from subagents must be included in the summary.
Protected tool outputs, protected tags, and protected user messages are carried separately by the plugin. Do not duplicate automatically retained payloads verbatim in your summary.

BATCHING
Use one content entry per independent replacement block in the content array. All entries are validated before the batch is applied.
`
}

export const COMPRESS_RANGE = rangePrompt()

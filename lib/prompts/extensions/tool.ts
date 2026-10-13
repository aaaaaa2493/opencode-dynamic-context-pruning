// These format schemas are kept separate from the editable compress prompts
// so they cannot be modified via custom prompt overrides. The schemas must
// match the tool's input validation and are not safe to change independently.

import type { IdFormat } from "../../message-ids"

export function rangeFormat(format: IdFormat = "xml"): string {
    const ids = format === "compact" ? "@4@ or @b1@ (include both @ characters)" : "mNNNN or bN"
    return `
THE FORMAT OF COMPRESS

\`\`\`
{
  topic: string,           // Short label (3-5 words) - e.g., "Auth System Exploration"
   content: [               // Independent replacements, each producing one new block
    {
      sources?: string[], // Exact visible sources: ${ids}; may be nonadjacent
      startId?: string,   // Inclusive range start; omit when using sources
      endId?: string,     // Inclusive range end; omit when using sources
      summary: string     // New standalone summary; rewrite old blocks without placeholders
    }
  ]
}
\`\`\``
}

export function messageFormat(format: IdFormat = "xml"): string {
    const ids =
        format === "compact"
            ? "@4@ (include both @ characters; omit priority labels)"
            : "mNNNN (ignore metadata attributes like priority)"
    return `
THE FORMAT OF COMPRESS

\`\`\`
{
  topic: string,           // Short label (3-5 words) for the overall batch
  content: [               // One or more messages to compress independently
    {
      messageId: string,   // Raw message ID only: ${ids}
      topic: string,       // Short label (3-5 words) for this one message summary
      summary: string      // Complete technical summary replacing that one message
    }
  ]
}
\`\`\``
}

export const RANGE_FORMAT_EXTENSION = rangeFormat()
export const MESSAGE_FORMAT_EXTENSION = messageFormat()

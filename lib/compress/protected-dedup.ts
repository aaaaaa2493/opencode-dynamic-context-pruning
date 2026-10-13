import type { ProtectedContentEntry } from "../state"
import type { SearchContext } from "./types"

export function compareProtectedEntries(
    a: ProtectedContentEntry,
    b: ProtectedContentEntry,
    context: SearchContext,
): number {
    const aIndex = context.rawIndexById.get(a.messageId)
    const bIndex = context.rawIndexById.get(b.messageId)
    if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex || a.partIndex - b.partIndex
    return a.createdAt - b.createdAt || a.messageId.localeCompare(b.messageId) || a.partIndex - b.partIndex
}

function protectionKey(entry: ProtectedContentEntry): string {
    if (entry.tool === "skill"
        && /^\n\nThe following protected tools were used in this conversation as well:\n### Tool: skill\n<skill_content name="[^"\n]+">\n/.test(entry.text)) {
        // Normalize only the terminal sampled resource list, never instruction examples.
        const files = /\n<skill_files>\n(?:<file>[^\r\n]*<\/file>\n)*\n?<\/skill_files>\n<\/skill_content>\s*$/.exec(entry.text)
        const baseDirectory = entry.text.lastIndexOf("\nBase directory for this skill: ")
        if (files && baseDirectory >= 0 && baseDirectory < files.index) {
            return "skill:" + entry.text.slice(0, files.index) + "\n</skill_content>"
        }
    }
    return "text:" + entry.text
}

export function deduplicateProtectedEntries(
    entries: ProtectedContentEntry[],
    context: SearchContext,
): ProtectedContentEntry[] {
    const unique = new Map<string, ProtectedContentEntry>()
    for (const entry of entries) {
        const key = protectionKey(entry)
        const previous = unique.get(key)
        if (!previous || compareProtectedEntries(entry, previous, context) > 0) unique.set(key, entry)
    }
    return [...unique.values()]
}

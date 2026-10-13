import type { CompressionBlock, ProtectedContentEntry, SessionState } from "../state"
import type { SearchContext, SelectionResolution, ToolContext } from "./types"
import { deduplicateProtectedEntries } from "./protected-dedup"
import {
    appendProtectedPromptInfo,
    appendProtectedUserMessages,
    collectProtectedToolEntries,
    selectLatestTodo,
} from "./protected-content"

function promptEntries(
    selection: SelectionResolution,
    context: SearchContext,
    state: SessionState,
    protectUsers: boolean,
    protectTags: boolean,
): ProtectedContentEntry[] {
    const entries: ProtectedContentEntry[] = []
    for (const messageId of selection.messageIds) {
        const message = context.rawMessagesById.get(messageId)
        if (!message) throw new Error("Original message unavailable: cannot reconstruct legacy protected content.")
        const one = { ...selection, messageIds: [messageId] }
        for (const text of [
            appendProtectedUserMessages("", one, context, state, protectUsers),
            appendProtectedPromptInfo("", one, context, state, protectTags),
        ]) {
            if (text) entries.push({ text, messageId, createdAt: message.info.time.created, partIndex: -1 })
        }
    }
    return entries
}

async function migrateLegacyEntries(
    block: CompressionBlock,
    ctx: ToolContext,
    selection: SelectionResolution,
    context: SearchContext,
    state: SessionState,
): Promise<ProtectedContentEntry[]> {
    if (block.protectedContent?.length === 0) return []
    // Reconstruct from original parts: legacy strings can combine arbitrary tool output.
    const oldSelection = { ...selection, messageIds: block.effectiveMessageIds }
    const entries = promptEntries(oldSelection, context, state, true, true)
    const names = new Set<string>()
    for (const messageId of oldSelection.messageIds) {
        for (const part of context.rawMessagesById.get(messageId)!.parts) {
            if (part.type === "tool" && part.tool !== "task" && part.tool !== "subagent") names.add(part.tool)
        }
    }
    entries.push(...await collectProtectedToolEntries(ctx.client, state, false, oldSelection, context, [...names]))
    const archived = block.protectedContent?.join("") ?? block.summary
    return entries.filter((entry) => archived.includes(entry.text.replace(/^\n\nThe following[^\n]*\n/, "")))
}

export async function collectHierarchicalProtection(
    ctx: ToolContext,
    selection: SelectionResolution,
    context: SearchContext,
): Promise<ProtectedContentEntry[]> {
    const state: SessionState = {
        ...ctx.state,
        prune: { ...ctx.state.prune, messages: { ...ctx.state.prune.messages, byMessageId: new Map() } },
    }
    const entries = promptEntries(selection, context, state,
        ctx.config.compress.protectUserMessages, ctx.config.compress.protectTags)
    entries.push(...await collectProtectedToolEntries(ctx.client, state, ctx.config.experimental.allowSubAgents,
        selection, context, ctx.config.compress.protectedTools, ctx.config.protectedFilePatterns))
    for (const blockId of selection.requiredBlockIds) {
        const block = context.summaryByBlockId.get(blockId)!
        const inherited = block.protectedEntries ?? await migrateLegacyEntries(block, ctx, selection, context, state)
        entries.push(...inherited.filter((entry) => entry.tool !== "task" && entry.tool !== "subagent"))
    }
    // Latest todo is determined before deduplication, by original part chronology.
    return deduplicateProtectedEntries(selectLatestTodo(entries, context), context)
}

import type { ProtectedContentEntry, SessionState } from "../state"
import { isIgnoredUserMessage } from "../messages/query"
import { isToolProtected } from "../protected-patterns"
import type { SearchContext, SelectionResolution } from "./types"
import { compareProtectedEntries, deduplicateProtectedEntries } from "./protected-dedup"

export function appendProtectedUserMessages(
    summary: string,
    selection: SelectionResolution,
    searchContext: SearchContext,
    state: SessionState,
    enabled: boolean,
): string {
    if (!enabled) return summary

    const userTexts: string[] = []

    for (const messageId of selection.messageIds) {
        const existingCompressionEntry = state.prune.messages.byMessageId.get(messageId)
        if (existingCompressionEntry && existingCompressionEntry.activeBlockIds.length > 0) {
            continue
        }

        const message = searchContext.rawMessagesById.get(messageId)
        if (!message) continue
        if (message.info.role !== "user") continue
        if (isIgnoredUserMessage(message)) continue

        const parts = Array.isArray(message.parts) ? message.parts : []
        for (const part of parts) {
            if (part.type === "text" && typeof part.text === "string" && part.text.trim()) {
                userTexts.push(part.text)
                break
            }
        }
    }

    if (userTexts.length === 0) {
        return summary
    }

    const heading = "\n\nThe following user messages were sent in this conversation verbatim:"
    const body = userTexts.map((text) => `\n${text}`).join("")
    return summary + heading + body
}

export function appendProtectedPromptInfo(
    summary: string,
    selection: SelectionResolution,
    searchContext: SearchContext,
    state: SessionState,
    enabled: boolean,
): string {
    if (!enabled) return summary

    const protectedTexts: string[] = []

    for (const messageId of selection.messageIds) {
        const existingCompressionEntry = state.prune.messages.byMessageId.get(messageId)
        if (existingCompressionEntry && existingCompressionEntry.activeBlockIds.length > 0) {
            continue
        }

        const message = searchContext.rawMessagesById.get(messageId)
        if (!message) continue
        if (message.info.role !== "user") continue
        if (isIgnoredUserMessage(message)) continue

        const parts = Array.isArray(message.parts) ? message.parts : []
        for (const part of parts) {
            if (part.type !== "text" || typeof part.text !== "string") continue

            protectedTexts.push(...extractProtectedPromptInfo(part.text))
        }
    }

    if (protectedTexts.length === 0) {
        return summary
    }

    const heading =
        "\n\nThe following protected prompt information was included in this conversation verbatim:"
    const body = protectedTexts.map((text) => `\n${text}`).join("")
    return summary + heading + body
}

export function extractProtectedPromptInfo(text: string): string[] {
    const protectedTexts: string[] = []
    const protectTagRegex = /<protect>([\s\S]*?)<\/protect>/gi

    for (const match of text.matchAll(protectTagRegex)) {
        const protectedText = match[1]?.trim()
        if (protectedText) {
            protectedTexts.push(protectedText)
        }
    }

    return protectedTexts
}

export async function collectProtectedToolEntries(
    _client: any,
    state: SessionState,
    _allowSubAgents: boolean,
    selection: SelectionResolution,
    searchContext: SearchContext,
    protectedTools: string[],
    protectedFilePatterns: string[] = [],
): Promise<ProtectedContentEntry[]> {
    const protectedOutputs: ProtectedContentEntry[] = []

    for (const messageId of selection.messageIds) {
        const existingCompressionEntry = state.prune.messages.byMessageId.get(messageId)
        if (existingCompressionEntry && existingCompressionEntry.activeBlockIds.length > 0) {
            continue
        }

        const message = searchContext.rawMessagesById.get(messageId)
        if (!message) continue

        const parts = Array.isArray(message.parts) ? message.parts : []
        for (const [partIndex, part] of parts.entries()) {
            if (part.type === "tool" && part.callID) {
                // V1 task and V2 subagent results belong in the rewritten narrative.
                if (part.tool === "task" || part.tool === "subagent") continue
                if (
                    isToolProtected(
                        part.tool,
                        part.state.input,
                        protectedTools,
                        protectedFilePatterns,
                        "metadata" in part.state ? part.state.metadata : undefined,
                    )
                ) {
                    let output = ""

                    if (part.state?.status === "completed" && part.state?.output) {
                        output =
                            typeof part.state.output === "string"
                                ? part.state.output
                                : JSON.stringify(part.state.output)
                    }

                    if (output) {
                        protectedOutputs.push({
                            text: `\n\nThe following protected tools were used in this conversation as well:\n### Tool: ${part.tool}\n${output}`,
                            tool: part.tool,
                            messageId,
                            createdAt: message.info.time.created,
                            partIndex,
                        })
                    }
                }
            }
        }
    }

    return protectedOutputs
}

export function selectLatestTodo(entries: ProtectedContentEntry[], context: SearchContext): ProtectedContentEntry[] {
    const isTodo = (entry: ProtectedContentEntry) => entry.tool === "todowrite" || entry.tool === "todoread"
    let latest: ProtectedContentEntry | undefined
    for (const entry of entries) {
        if (isTodo(entry) && (!latest || compareProtectedEntries(entry, latest, context) > 0)) latest = entry
    }
    return entries.filter((entry) => !isTodo(entry) || entry === latest)
}

export async function appendProtectedTools(
    client: any,
    state: SessionState,
    allowSubAgents: boolean,
    summary: string,
    selection: SelectionResolution,
    searchContext: SearchContext,
    protectedTools: string[],
    protectedFilePatterns: string[] = [],
): Promise<string> {
    const entries = await collectProtectedToolEntries(client, state, allowSubAgents, selection, searchContext,
        protectedTools, protectedFilePatterns)
    return summary + deduplicateProtectedEntries(selectLatestTodo(entries, searchContext), searchContext)
        .map((entry) => entry.text).join("")
}

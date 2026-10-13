import type { WithParts } from "../state"
import { ensureSessionInitialized, refreshManualMode } from "../state"
import { saveSessionState } from "../state/persistence"
import { assignMessageRefs } from "../message-ids"
import { isIgnoredUserMessage } from "../messages/query"
import { deduplicate, purgeErrors } from "../strategies"
import { createCompressNotification } from "../ui/notification"
import { showCompressionReport } from "../ui/compression-report"
import type { ToolContext } from "./types"
import { buildSearchContext, fetchSessionMessages } from "./search"
import type { SearchContext } from "./types"
import { applyPendingCompressionDurations } from "./timing"

interface RunContext {
    ask(input: {
        permission: string
        patterns: string[]
        always: string[]
        metadata: Record<string, unknown>
    }): Promise<void>
    metadata(input: { title: string }): void
    sessionID: string
    messageID?: string
}

export interface NotificationEntry {
    blockId: number
    runId: number
    summary: string
    summaryTokens: number
}

export interface PreparedSession {
    rawMessages: WithParts[]
    searchContext: SearchContext
}

export async function prepareSession(
    ctx: ToolContext,
    toolCtx: RunContext,
    title: string,
): Promise<PreparedSession> {
    await refreshManualMode(ctx.state, toolCtx.sessionID, ctx.logger, ctx.config.manualMode.enabled)

    if (ctx.state.manualMode && ctx.state.manualMode !== "compress-pending") {
        throw new Error(
            "Manual mode: compress blocked. Do not retry until `<compress triggered manually>` appears in user context.",
        )
    }

    await toolCtx.ask({
        permission: "compress",
        patterns: ["*"],
        always: ["*"],
        metadata: {},
    })

    toolCtx.metadata({ title })

    const rawMessages = await fetchSessionMessages(ctx.client, toolCtx.sessionID)

    await ensureSessionInitialized(
        ctx.client,
        ctx.state,
        toolCtx.sessionID,
        ctx.logger,
        rawMessages,
        ctx.config.manualMode.enabled,
    )

    assignMessageRefs(ctx.state, rawMessages)

    deduplicate(ctx.state, ctx.logger, ctx.config, rawMessages)
    purgeErrors(ctx.state, ctx.logger, ctx.config, rawMessages)

    return {
        rawMessages,
        searchContext: buildSearchContext(ctx.state, rawMessages),
    }
}

export async function finalizeSession(
    ctx: ToolContext,
    toolCtx: RunContext,
    rawMessages: WithParts[],
    entries: NotificationEntry[],
    batchTopic: string | undefined,
): Promise<string | undefined> {
    if (ctx.state.manualMode === "compress-pending") {
        ctx.state.manualMode = false
        await refreshManualMode(
            ctx.state,
            toolCtx.sessionID,
            ctx.logger,
            ctx.config.manualMode.enabled,
        )
    }
    applyPendingCompressionDurations(ctx.state)
    await saveSessionState(ctx.state, ctx.logger)

    const sessionMessageIds = rawMessages
        .filter((msg) => !isIgnoredUserMessage(msg))
        .map((msg) => msg.info.id)

    const notification = await createCompressNotification(
        ctx.client,
        ctx.logger,
        ctx.config,
        ctx.state,
        entries,
        batchTopic,
        sessionMessageIds,
    )
    if (!notification) return

    const message = rawMessages.find((message) => message.info.id === toolCtx.messageID)
    const callID = ctx.state.prune.messages.blocksById.get(entries[0]?.blockId ?? -1)?.compressCallId
    const calls = message?.parts.filter((part) => part.type === "tool" && part.tool === "compress") ?? []
    const toolPart = calls.find((part) => part.type === "tool" && part.callID === callID)
        ?? (!callID && calls.length === 1 ? calls[0] : undefined)
    // V2 exposes no public part-update API. A report in its tool result remains
    // visible in host history and is stripped from subsequent provider context.
    if (ctx.state.idFormat === "compact") return notification
    try {
        if (message?.info.role !== "assistant" || !toolPart || !toolCtx.messageID) {
            throw new Error("Cannot locate the assistant compression tool part")
        }
        await showCompressionReport(ctx.client, toolCtx.sessionID, toolCtx.messageID, toolPart.id, notification)
    } catch (error) {
        ctx.logger.warn("Could not display compression report; keeping it in tool output", { error: String(error) })
        return notification
    }
}

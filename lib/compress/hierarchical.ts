import { tool } from "@opencode-ai/plugin"
import { appendCompressionNotification } from "./notification-output"
import { isCompressionHistoryAnnotation } from "./history-annotation"
import { parseBoundaryId, formatBlockRef, type IdFormat } from "../message-ids"
import { isIgnoredUserMessage } from "../messages/query"
import { syncCompressionBlocks } from "../messages/sync"
import { countAllMessageTokens, countTokens } from "../token-utils"
import { saveSessionState } from "../state/persistence"
import type { SessionState } from "../state"
import { rangeFormat } from "../prompts/extensions/tool"
import { finalizeSession, prepareSession, type NotificationEntry } from "./pipeline"
import { buildSearchContext, resolveAnchorMessageId } from "./search"
import { collectHierarchicalProtection } from "./hierarchical-protection"
import { countSelectedContextTokens } from "./selection-tokens"
import { allocateBlockId, allocateRunId, applyCompressionState, wrapCompressedSummary } from "./state"
import type { BoundaryReference, SearchContext, SelectionResolution, ToolContext } from "./types"

interface Entry {
    sources?: string[]
    startId?: string
    endId?: string
    summary: string
}

interface Source {
    ref: string
    boundary: BoundaryReference
    messageIds: string[]
    blockId?: number
}

function visibleSources(context: SearchContext, state: SessionState): Map<string, Source> {
    const sources = new Map<string, Source>()
    for (const [ref, messageId] of state.messageIds.byRef) {
        const message = context.rawMessagesById.get(messageId)
        const rawIndex = context.rawIndexById.get(messageId)
        if (!message || rawIndex === undefined || isIgnoredUserMessage(message)) continue
        if (message.info.time.created < state.lastCompaction) continue
        if (state.prune.messages.byMessageId.get(messageId)?.activeBlockIds.length) continue
        sources.set(ref, { ref, boundary: { kind: "message", rawIndex, messageId }, messageIds: [messageId] })
    }
    for (const block of context.summaryByBlockId.values()) {
        const rawIndex = context.rawIndexById.get(block.anchorMessageId)
        if (rawIndex === undefined || block.archived) continue
        const ref = formatBlockRef(block.blockId, state.idFormat)
        sources.set(ref, {
            ref,
            boundary: { kind: "compressed-block", rawIndex, blockId: block.blockId, anchorMessageId: block.anchorMessageId },
            messageIds: block.effectiveMessageIds,
            blockId: block.blockId,
        })
    }
    return sources
}

function resolveSources(
    entry: Entry,
    available: Map<string, Source>,
    format: IdFormat,
): Source[] {
    const hasRange = entry.startId !== undefined || entry.endId !== undefined
    if ((entry.sources !== undefined) === hasRange) {
        throw new Error("Specify either sources or both startId/endId, never both selection forms.")
    }
    const lookup = (ref: string): Source => {
        const parsed = parseBoundaryId(ref, format)
        const source = parsed && available.get(parsed.ref)
        if (!source) throw new Error(`Source ${ref} is not visible/active. Use an injected ${format === "compact" ? "@4@ or @b1@" : "mNNNN or bN"} ID.`)
        return source
    }
    let selected: Source[]
    if (entry.sources !== undefined) {
        if (!entry.sources.length) throw new Error("sources must not be empty.")
        selected = entry.sources.map(lookup)
    } else {
        if (!entry.startId || !entry.endId) throw new Error("Both startId and endId are required.")
        const start = lookup(entry.startId)
        const end = lookup(entry.endId)
        if (start.boundary.rawIndex > end.boundary.rawIndex) throw new Error("startId must precede endId.")
        selected = [...available.values()].filter((source) =>
            source.boundary.rawIndex >= start.boundary.rawIndex && source.boundary.rawIndex <= end.boundary.rawIndex,
        )
    }
    return selected.sort((a, b) => a.boundary.rawIndex - b.boundary.rawIndex)
}

function selectionFor(sources: Source[], context: SearchContext): SelectionResolution {
    const messageIds = sources
        .filter((source) => source.blockId === undefined)
        .flatMap((source) => source.messageIds)
    const messageTokenById = new Map<string, number>()
    const toolIds = new Set<string>()
    for (const messageId of messageIds) {
        const message = context.rawMessagesById.get(messageId)!
        messageTokenById.set(messageId, countAllMessageTokens(message))
        for (const part of message.parts) {
            if (part.type === "tool") {
                if (part.state.status !== "completed" && part.state.status !== "error") {
                    throw new Error("Cannot compress a message containing an unfinished tool call.")
                }
                toolIds.add(part.callID)
            }
        }
    }
    return {
        startReference: sources[0]!.boundary,
        endReference: sources[sources.length - 1]!.boundary,
        messageIds,
        messageTokenById,
        toolIds: [...toolIds],
        requiredBlockIds: sources.flatMap((source) => source.blockId === undefined ? [] : [source.blockId]),
    }
}

export function createHierarchicalCompressTool(ctx: ToolContext): ReturnType<typeof tool> {
    ctx.prompts.reload()
    const ids = ctx.state.idFormat === "compact" ? "@4@/@b1@" : "mNNNN/bN"
    return tool({
        description: ctx.prompts.getRuntimePrompts().compressRange + rangeFormat(ctx.state.idFormat),
        args: {
            topic: tool.schema.string().describe("Short label (3-5 words) for this batch"),
            content: tool.schema.array(tool.schema.object({
                sources: tool.schema.array(tool.schema.string()).optional().describe(`Exact visible ${ids} sources, including nonadjacent messages and blocks`),
                startId: tool.schema.string().optional().describe("Inclusive range start; omit when using sources"),
                endId: tool.schema.string().optional().describe("Inclusive range end; omit when using sources"),
                summary: tool.schema.string().describe("New standalone summary; rewrite selected old blocks without placeholders"),
            })).describe("Independent selections, each replaced by one new block"),
        },
        async execute(input, toolCtx) {
            toolCtx.abort.throwIfAborted()
            const callId = (toolCtx as unknown as { callID?: string }).callID
            if (!input.topic.trim() || !input.content.length) throw new Error("topic and content must not be empty.")
            for (const entry of input.content) {
                if (!entry.summary.trim()) throw new Error("summary must not be empty.")
                if (isCompressionHistoryAnnotation(entry.summary)) {
                    throw new Error("This is a DCP history annotation, not a summary. The previous compression succeeded; no corrective call is needed.")
                }
                if (/\(b\d+\)|@b\d+@/.test(entry.summary)) {
                    throw new Error("Rewrite old blocks in the summary. Block placeholders are no longer expanded.")
                }
                if (/<\/?dcp-(?:message-id|system-reminder)\b/i.test(entry.summary)) {
                    throw new Error("Do not include DCP metadata tags in summaries.")
                }
            }
            const { rawMessages } = await prepareSession(ctx, toolCtx, `Compress: ${input.topic}`)
            syncCompressionBlocks(ctx.state, ctx.logger, rawMessages)
            const context = buildSearchContext(ctx.state, rawMessages)
            const available = visibleSources(context, ctx.state)
            const claimedMessages = new Set<string>()
            const claimedSources = new Set<string>()
            const plans = input.content.map((entry) => {
                const sources = resolveSources(entry, available, ctx.state.idFormat)
                for (const source of sources) {
                    if (claimedSources.has(source.ref)) throw new Error(`Duplicate source ${source.ref} in this batch.`)
                    claimedSources.add(source.ref)
                    for (const messageId of source.messageIds) {
                        if (messageId === toolCtx.messageID) throw new Error("Cannot compress the current tool-call message.")
                        if (claimedMessages.has(messageId)) throw new Error("Selections overlap, including nested block ancestry.")
                        claimedMessages.add(messageId)
                    }
                }
                const selection = selectionFor(sources, context)
                const sourceTokens = countSelectedContextTokens(ctx, selection, context)
                return {
                    entry,
                    sources,
                    selection,
                    sourceTokens,
                    anchorMessageId: resolveAnchorMessageId(selection.endReference),
                }
            })

            // Validate all replacements before changing the graph.
            const prepared = []
            for (const [index, plan] of plans.entries()) {
                const protectedEntries = await collectHierarchicalProtection(ctx, plan.selection, context)
                const protections = protectedEntries.map((entry) => entry.text)
                const summary = plan.entry.summary.trim() + protections.join("")
                const storedSummary = wrapCompressedSummary(
                    ctx.state.prune.messages.nextBlockId + index,
                    summary,
                    ctx.state.idFormat,
                )
                const summaryTokens = countTokens(storedSummary)
                if (summaryTokens >= plan.sourceTokens) {
                    throw new Error(`Compression must shrink each selection including protected content (${summaryTokens} >= ${plan.sourceTokens} estimated tokens). Shorten the summary or select more related sources.`)
                }
                prepared.push({ ...plan, protections, protectedEntries, summary, storedSummary, summaryTokens })
            }

            const previousMessages = ctx.state.prune.messages
            toolCtx.abort.throwIfAborted()
            const previousStats = ctx.state.stats
            ctx.state.prune.messages = structuredClone(previousMessages)
            ctx.state.stats = { ...previousStats }
            const notifications: NotificationEntry[] = []
            try {
                const runId = allocateRunId(ctx.state)
                for (const plan of prepared) {
                    const blockId = allocateBlockId(ctx.state)
                    applyCompressionState(
                        ctx.state,
                        {
                            topic: input.topic,
                            batchTopic: input.topic,
                            mode: "range",
                            runId,
                            startId: plan.sources[0]!.ref,
                            endId: plan.sources[plan.sources.length - 1]!.ref,
                            compressMessageId: toolCtx.messageID,
                            compressCallId: callId,
                            summaryTokens: plan.summaryTokens,
                        },
                        plan.selection,
                        plan.anchorMessageId,
                        blockId,
                        plan.storedSummary,
                        plan.selection.requiredBlockIds,
                    )
                    const block = ctx.state.prune.messages.blocksById.get(blockId)!
                    block.sourceRefs = plan.sources.map((source) => source.ref)
                    block.protectedContent = plan.protections
                    block.protectedEntries = plan.protectedEntries
                    notifications.push({ blockId, runId, summary: plan.summary, summaryTokens: plan.summaryTokens })
                }
                await saveSessionState(ctx.state, ctx.logger, undefined, true)
            } catch (error) {
                ctx.state.prune.messages = previousMessages
                ctx.state.stats = previousStats
                throw error
            }
            let notification: string | undefined
            try {
                notification = await finalizeSession(ctx, toolCtx, rawMessages, notifications, input.topic)
            } catch (error) {
                ctx.logger.warn("Compression saved; notification failed", { error: String(error) })
            }
            const before = prepared.reduce((sum, plan) => sum + plan.sourceTokens, 0)
            const after = prepared.reduce((sum, plan) => sum + plan.summaryTokens, 0)
            const blockRefs = notifications
                .map((entry) => formatBlockRef(entry.blockId, ctx.state.idFormat))
                .join(", ")
            return appendCompressionNotification(
                `Compressed ${claimedSources.size} sources into ${blockRefs}. Estimated selected-context tokens: ${before} -> ${after}. Earlier block versions retained.`,
                notification,
            )
        },
    })
}

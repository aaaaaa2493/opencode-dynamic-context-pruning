import type { Logger } from "../logger"
import type { SessionState } from "../state"
import {
    formatPrunedItemsList,
    formatProgressBar,
    formatStatsHeader,
    formatTokenCount,
} from "./utils"
import { ToolParameterEntry } from "../state"
import { PluginConfig } from "../config"

export type PruneReason = "completion" | "noise" | "extraction"
export const PRUNE_REASON_LABELS: Record<PruneReason, string> = {
    completion: "Task Complete",
    noise: "Noise Removal",
    extraction: "Extraction",
}

interface CompressionNotificationEntry {
    blockId: number
    runId: number
    summary: string
    summaryTokens: number
}

function buildMinimalMessage(state: SessionState, reason: PruneReason | undefined): string {
    const reasonSuffix = reason ? ` — ${PRUNE_REASON_LABELS[reason]}` : ""
    return (
        formatStatsHeader(state.stats.totalPruneTokens, state.stats.pruneTokenCounter) +
        reasonSuffix
    )
}

function buildDetailedMessage(
    state: SessionState,
    reason: PruneReason | undefined,
    pruneToolIds: string[],
    toolMetadata: Map<string, ToolParameterEntry>,
    workingDirectory: string,
): string {
    let message = formatStatsHeader(state.stats.totalPruneTokens, state.stats.pruneTokenCounter)

    if (pruneToolIds.length > 0) {
        const pruneTokenCounterStr = `~${formatTokenCount(state.stats.pruneTokenCounter)}`
        const reasonLabel = reason ? ` — ${PRUNE_REASON_LABELS[reason]}` : ""
        message += `\n\n▣ Pruning (${pruneTokenCounterStr})${reasonLabel}`

        const itemLines = formatPrunedItemsList(pruneToolIds, toolMetadata, workingDirectory)
        message += "\n" + itemLines.join("\n")
    }

    return message.trim()
}

const TOAST_BODY_MAX_LINES = 12
const TOAST_SUMMARY_MAX_CHARS = 600

function truncateToastBody(body: string, maxLines: number = TOAST_BODY_MAX_LINES): string {
    const lines = body.split("\n")
    if (lines.length <= maxLines) {
        return body
    }
    const kept = lines.slice(0, maxLines - 1)
    const remaining = lines.length - maxLines + 1
    return kept.join("\n") + `\n... and ${remaining} more`
}

function truncateToastSummary(summary: string, maxChars: number = TOAST_SUMMARY_MAX_CHARS): string {
    if (summary.length <= maxChars) {
        return summary
    }
    return summary.slice(0, maxChars - 3) + "..."
}

function truncateExtractedSection(
    message: string,
    maxChars: number = TOAST_SUMMARY_MAX_CHARS,
): string {
    const marker = "\n\n▣ Extracted"
    const index = message.indexOf(marker)
    if (index === -1) {
        return message
    }
    const extracted = message.slice(index)
    if (extracted.length <= maxChars) {
        return message
    }
    return message.slice(0, index) + truncateToastSummary(extracted, maxChars)
}

export async function sendUnifiedNotification(
    client: any,
    logger: Logger,
    config: PluginConfig,
    state: SessionState,
    sessionId: string,
    pruneToolIds: string[],
    toolMetadata: Map<string, ToolParameterEntry>,
    reason: PruneReason | undefined,
    params: any,
    workingDirectory: string,
): Promise<boolean> {
    const hasPruned = pruneToolIds.length > 0
    if (!hasPruned) {
        return false
    }

    if (config.pruneNotification === "off") {
        return false
    }

    const message =
        config.pruneNotification === "minimal"
            ? buildMinimalMessage(state, reason)
            : buildDetailedMessage(state, reason, pruneToolIds, toolMetadata, workingDirectory)

    if (config.pruneNotificationType === "toast") {
        let toastMessage = truncateExtractedSection(message)
        toastMessage =
            config.pruneNotification === "minimal" ? toastMessage : truncateToastBody(toastMessage)

        await client.tui.showToast({
            body: {
                title: "DCP: Compress Notification",
                message: toastMessage,
                variant: "info",
                duration: 5000,
            },
        })
        return true
    }

    await sendIgnoredMessage(client, sessionId, message, params, logger)
    return true
}

function buildCompressionSummary(
    entries: CompressionNotificationEntry[],
    state: SessionState,
): string {
    if (entries.length === 1) {
        return entries[0]?.summary ?? ""
    }

    return entries
        .map((entry) => {
            const topic =
                state.prune.messages.blocksById.get(entry.blockId)?.topic ?? "(unknown topic)"
            return `### ${topic}\n${entry.summary}`
        })
        .join("\n\n")
}

function getCompressionLabel(entries: CompressionNotificationEntry[]): string {
    const runId = entries[0]?.runId
    if (runId === undefined) {
        return "Compression"
    }

    return `Compression #${runId}`
}

function formatCompressionMetrics(removedTokens: number, summaryTokens: number): string {
    const metrics = [`-${formatTokenCount(removedTokens, true)} removed`]
    if (summaryTokens > 0) {
        metrics.push(`+${formatTokenCount(summaryTokens, true)} summary`)
    }
    return metrics.join(", ")
}

function getConsumedSummaryTokens(state: SessionState, blockId: number): number {
    const block = state.prune.messages.blocksById.get(blockId)
    return [...new Set(block?.consumedBlockIds ?? [])].reduce((total, consumedBlockId) => {
        return total + (state.prune.messages.blocksById.get(consumedBlockId)?.summaryTokens ?? 0)
    }, 0)
}

export async function createCompressNotification(
    client: any,
    logger: Logger,
    config: PluginConfig,
    state: SessionState,
    entries: CompressionNotificationEntry[],
    batchTopic: string | undefined,
    sessionMessageIds: string[],
): Promise<string | undefined> {
    if (config.pruneNotification === "off") {
        return
    }

    if (entries.length === 0) {
        return
    }

    let message: string
    const compressionLabel = getCompressionLabel(entries)
    const summary = buildCompressionSummary(entries, state)
    const summaryTokens = entries.reduce((total, entry) => total + entry.summaryTokens, 0)
    const summaryTokensStr = formatTokenCount(summaryTokens)
    const compressedTokens = entries.reduce((total, entry) => {
        const compressionBlock = state.prune.messages.blocksById.get(entry.blockId)
        if (!compressionBlock) {
            logger.error("Compression block missing for notification", {
                compressionId: entry.blockId,
                sessionId: state.sessionId,
            })
            return total
        }

        return total + compressionBlock.compressedTokens + getConsumedSummaryTokens(state, entry.blockId)
    }, 0)

    const newlyCompressedMessageIds: string[] = []
    const newlyCompressedToolIds: string[] = []
    const seenMessageIds = new Set<string>()
    const seenToolIds = new Set<string>()
    const compressedSummaryIds = new Set<number>()

    for (const entry of entries) {
        const compressionBlock = state.prune.messages.blocksById.get(entry.blockId)
        if (!compressionBlock) {
            continue
        }

        for (const blockId of compressionBlock.consumedBlockIds) {
            compressedSummaryIds.add(blockId)
        }

        for (const messageId of compressionBlock.directMessageIds) {
            if (seenMessageIds.has(messageId)) {
                continue
            }
            seenMessageIds.add(messageId)
            newlyCompressedMessageIds.push(messageId)
        }

        for (const toolId of compressionBlock.directToolIds) {
            if (seenToolIds.has(toolId)) {
                continue
            }
            seenToolIds.add(toolId)
            newlyCompressedToolIds.push(toolId)
        }
    }

    const topic =
        batchTopic ??
        (entries.length === 1
            ? (state.prune.messages.blocksById.get(entries[0]?.blockId ?? -1)?.topic ??
              "(unknown topic)")
            : "(unknown topic)")

    let totalSummaryTokens = 0
    let totalRemovedSummaryTokens = 0
    for (const block of state.prune.messages.blocksById.values()) {
        totalSummaryTokens += block.summaryTokens
        totalRemovedSummaryTokens += getConsumedSummaryTokens(state, block.blockId)
    }
    const totalGross = state.stats.totalPruneTokens + state.stats.pruneTokenCounter + totalRemovedSummaryTokens
    const notificationHeader = `▣ DCP | ${formatCompressionMetrics(totalGross, totalSummaryTokens)}`

    if (config.pruneNotification === "minimal") {
        message = `${notificationHeader} — ${compressionLabel}`
    } else {
        message = notificationHeader

        const activePrunedMessages = new Map<string, number>()
        for (const [messageId, entry] of state.prune.messages.byMessageId) {
            if (entry.activeBlockIds.length > 0) {
                activePrunedMessages.set(messageId, entry.tokenCount)
            }
        }
        const progressBar = formatProgressBar(
            sessionMessageIds,
            activePrunedMessages,
            newlyCompressedMessageIds,
            50,
        )
        message += `\n\n${progressBar}`
        message += `\n▣ ${compressionLabel} ${formatCompressionMetrics(compressedTokens, summaryTokens)}`
        message += `\n→ Topic: ${topic}`
        message += `\n→ Items: ${newlyCompressedMessageIds.length} messages compressed, ${compressedSummaryIds.size} summaries compressed`
        if (newlyCompressedToolIds.length > 0) {
            message += `, ${newlyCompressedToolIds.length} tools compressed`
        }
        if (config.compress.showCompression) {
            message += `\n→ Compression (~${summaryTokensStr}): ${summary}`
        }
    }

    if (config.pruneNotificationType === "toast") {
        let toastMessage = message
        if (config.compress.showCompression) {
            const truncatedSummary = truncateToastSummary(summary)
            if (truncatedSummary !== summary) {
                toastMessage = toastMessage.replace(
                    `\n→ Compression (~${summaryTokensStr}): ${summary}`,
                    `\n→ Compression (~${summaryTokensStr}): ${truncatedSummary}`,
                )
            }
        }
        toastMessage =
            config.pruneNotification === "minimal" ? toastMessage : truncateToastBody(toastMessage)

        await client.tui.showToast({
            body: {
                title: "DCP: Compress Notification",
                message: toastMessage,
                variant: "info",
                duration: 5000,
            },
        })
        return
    }

    return message
}

export async function sendIgnoredMessage(
    client: any,
    sessionID: string,
    text: string,
    params: any,
    logger: Logger,
): Promise<void> {
    const agent = params.agent || undefined
    const variant = params.variant || undefined
    const model =
        params.providerId && params.modelId
            ? {
                  providerID: params.providerId,
                  modelID: params.modelId,
              }
            : undefined

    try {
        await client.session.prompt({
            path: {
                id: sessionID,
            },
            body: {
                noReply: true,
                agent: agent,
                model: model,
                variant: variant,
                parts: [
                    {
                        type: "text",
                        text: text,
                        ignored: true,
                    },
                ],
            },
        })
    } catch (error: any) {
        logger.error("Failed to send notification", { error: error.message })
    }
}

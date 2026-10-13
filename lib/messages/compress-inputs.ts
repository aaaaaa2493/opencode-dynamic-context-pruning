import type { CompressionBlock, SessionState, WithParts } from "../state"
import { stripCompressionNotification } from "../compress/notification-output"
import { formatCompressionHistoryAnnotation } from "../compress/history-annotation"

/** Transform copies only; the host retains original calls and archived block versions. */
export function pruneCompressionInputs(state: SessionState, messages: WithParts[]): void {
    const blocksByMessage = new Map<string, CompressionBlock[]>()
    for (const block of state.prune.messages.blocksById.values()) {
        const blocks = blocksByMessage.get(block.compressMessageId) ?? []
        blocks.push(block)
        blocksByMessage.set(block.compressMessageId, blocks)
    }
    for (const message of messages) {
        const blocks = blocksByMessage.get(message.info.id)
        if (!blocks) continue
        const calls = message.parts.filter((part) => part.type === "tool" && part.tool === "compress")
        for (const part of calls) {
            if (part.type !== "tool" || part.state.status !== "completed") continue
            const matching = blocks.filter((block) => block.compressCallId === part.callID
                || (!block.compressCallId && calls.length === 1)).sort((a, b) => a.blockId - b.blockId)
            const input = part.state.input
            const entries = input?.content
            if (!Array.isArray(entries) || matching.length !== entries.length || !matching.length) continue
            part.state.output = stripCompressionNotification(part.state.output)
            part.state.input = {
                ...input,
                content: entries.map((entry, index) => entry && typeof entry.summary === "string"
                    ? { ...entry, summary: formatCompressionHistoryAnnotation(matching[index]!.blockId) }
                    : entry),
            }
        }
    }
}

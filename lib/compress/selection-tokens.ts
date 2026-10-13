import { prune } from "../messages/prune"
import { countAllMessageTokens, countTokens } from "../token-utils"
import type { SearchContext, SelectionResolution, ToolContext } from "./types"

export function countSelectedContextTokens(
    ctx: ToolContext,
    selection: SelectionResolution,
    context: SearchContext,
): number {
    const messages = structuredClone(
        selection.messageIds
            .filter((id) => !ctx.state.prune.messages.byMessageId.get(id)?.activeBlockIds.length)
            .map((id) => context.rawMessagesById.get(id)!),
    )
    prune(ctx.state, ctx.logger, ctx.config, messages)
    return messages.reduce((sum, message) => sum + countAllMessageTokens(message), 0)
        + selection.requiredBlockIds.reduce((sum, id) => sum + countTokens(context.summaryByBlockId.get(id)!.summary), 0)
}

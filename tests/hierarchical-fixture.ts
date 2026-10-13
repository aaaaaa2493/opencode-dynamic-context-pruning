import { randomUUID } from "node:crypto"
import { createHierarchicalCompressTool } from "../lib/compress/hierarchical"
import { createSessionState, ensureSessionInitialized, type WithParts } from "../lib/state"
import { assignMessageRefs, formatBlockRef, type IdFormat } from "../lib/message-ids"
import { syncCompressionBlocks } from "../lib/messages/sync"
import { prune } from "../lib/messages/prune"
import { handleDecompressCommand } from "../lib/commands/decompress"
import { handleRecompressCommand } from "../lib/commands/recompress"
import { Logger } from "../lib/logger"
import type { PluginConfig } from "../lib/config"
import type { ToolContext } from "../lib/compress"

export const logger = new Logger(false)
export const verbose = (label: string, count = 300) => `${label}: ` + "Observed implementation details and intermediate investigation results. ".repeat(count)

export function config(): PluginConfig {
    return {
        enabled: true, autoUpdate: false, debug: false,
        pruneNotification: "off", pruneNotificationType: "chat",
        commands: { enabled: true, protectedTools: [] },
        manualMode: { enabled: false, automaticStrategies: true },
        turnProtection: { enabled: false, turns: 4 },
        experimental: { allowSubAgents: true, customPrompts: false },
        protectedFilePatterns: [],
        compress: {
            mode: "range", permission: "allow", showCompression: false, summaryBuffer: false,
            maxContextLimit: 320000, minContextLimit: 220000, nudgeFrequency: 5,
            iterationNudgeThreshold: 15, nudgeForce: "soft", protectedTools: [],
            protectTags: false, protectUserMessages: false,
        },
        strategies: {
            deduplication: { enabled: false, protectedTools: [] },
            purgeErrors: { enabled: false, turns: 4, protectedTools: [] },
        },
    }
}

export async function fixture(format: IdFormat = "xml", subagent = false) {
    const sessionID = `ses_hierarchy_${randomUUID()}`
    const state = createSessionState(format)
    const cfg = config()
    const messages: WithParts[] = []
    const notices: unknown[] = []
    const reports: unknown[] = []
    const client = {
        session: {
            messages: async () => ({ data: structuredClone(messages) }),
            get: async () => ({ data: { parentID: subagent ? "ses_parent" : null } }),
            prompt: async (input: unknown) => { notices.push(input); return { data: {} } },
        },
        _client: { patch: async (input: unknown) => { reports.push(input) } },
    }
    const ctx = {
        client, state, config: cfg, logger,
        prompts: { reload() {}, getRuntimePrompts: () => ({ compressRange: "", compressMessage: "" }) },
    } as unknown as ToolContext
    function add(text: string, role: "user" | "assistant" = "assistant") {
        const id = `${sessionID}_msg_${messages.length + 1}`
        const message = {
            info: {
                id, sessionID, role, agent: "build", time: { created: messages.length + 1 },
                model: { providerID: "test", modelID: "test" }, modelID: "test", providerID: "test",
                tokens: { input: 10000, output: 10, reasoning: 0, cache: { read: 0, write: 0 } },
            },
            parts: [{ type: "text", id: `${id}_text`, messageID: id, sessionID, text }],
        } as WithParts
        messages.push(message)
        return message
    }
    add("Keep the requested behavior and distinguish plans from completed work.", "user")
    const first = add(verbose("FIRST RAW"))
    const middle = add(verbose("UNSELECTED MIDDLE", 10))
    const last = add(verbose("LAST RAW"))
    await ensureSessionInitialized(client, state, sessionID, logger, messages, false)
    assignMessageRefs(state, messages)
    const tool = createHierarchicalCompressTool(ctx)
    function ref(message: WithParts) {
        assignMessageRefs(state, messages)
        return state.messageIds.byRawId.get(message.info.id)!
    }
    function blockRef(id: number) { return formatBlockRef(id, format) }
    async function compress(content: Parameters<typeof tool.execute>[0]["content"], aborted = false, useTool = tool) {
        const call = add("Compress these completed findings.")
        const input = { topic: "Completed investigation details", content }
        const part = {
            type: "tool", id: `${call.info.id}_tool`, sessionID, messageID: call.info.id,
            callID: `${call.info.id}_call`, tool: "compress",
            state: { status: "running", input: structuredClone(input), time: { start: 1 } },
        } as WithParts["parts"][number]
        call.parts.push(part)
        const controller = new AbortController()
        if (aborted) controller.abort()
        try {
            const result = await useTool.execute(input, {
                sessionID, messageID: call.info.id, callID: `${call.info.id}_call`,
                abort: controller.signal, ask: async () => {}, metadata: () => {},
            } as Parameters<typeof tool.execute>[1])
            if (part.type === "tool") part.state = { ...part.state, status: "completed", output: result as string,
                title: "Compress", metadata: {}, time: { start: 1, end: 2 } }
            return result
        } catch (error) {
            if (part.type === "tool") part.state = { ...part.state, status: "error", error: String(error), time: { start: 1, end: 2 } }
            throw error
        }
    }
    function visible() {
        syncCompressionBlocks(state, logger, messages)
        const result = structuredClone(messages)
        prune(state, logger, cfg, result)
        return result
    }
    async function restart() {
        const restored = createSessionState(format)
        await ensureSessionInitialized(client, restored, sessionID, logger, messages, false)
        syncCompressionBlocks(restored, logger, messages)
        return restored
    }
    async function command(kind: "decompress" | "recompress", id: number) {
        const handler = kind === "decompress" ? handleDecompressCommand : handleRecompressCommand
        await handler({ client, state, logger, sessionId: sessionID, messages, args: [blockRef(id)] })
    }
    return { sessionID, state, cfg, ctx, client, messages, notices, reports, add, first, middle, last, ref, blockRef, compress, visible, restart, command, tool }
}

export function addTool(message: WithParts, tool: string, output: string) {
    const id = `${message.info.id}_${tool}_${message.parts.length}`
    const part = {
        type: "tool", id, messageID: message.info.id, sessionID: message.info.sessionID,
        tool, callID: id,
        state: { status: "completed", input: {}, output, title: tool, metadata: {}, time: { start: 1, end: 2 } },
    } as Extract<WithParts["parts"][number], { type: "tool" }>
    message.parts.push(part)
    return part
}

export function skillResult(files: string[], body = "Follow these instructions.", directory = "/skills/example", name = "example") {
    return `<skill_content name="${name}">\n# Skill: ${name}\n\n${body}\n\nBase directory for this skill: ${directory}\nRelative paths in this skill (e.g., scripts/, reference/) are relative to this base directory.\nNote: file list is sampled.\n\n<skill_files>\n${files.map((file) => `<file>${file}</file>`).join("\n")}\n</skill_files>\n</skill_content>`
}

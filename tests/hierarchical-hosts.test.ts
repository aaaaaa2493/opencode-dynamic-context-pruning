import assert from "node:assert/strict"
import test from "node:test"
import { mkdtempSync, rmSync } from "node:fs"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import type { Plugin } from "@opencode/plugin"

const root = mkdtempSync(join(tmpdir(), "dcp-hierarchical-hosts-"))
process.env.XDG_DATA_HOME = join(root, "data")
process.env.XDG_CONFIG_HOME = join(root, "config")
process.env.OPENCODE_CONFIG_DIR = join(root, "config", "opencode")
test.after(() => rmSync(root, { recursive: true, force: true }))

const { fixture, config, verbose } = await import("./hierarchical-fixture")
const { default: plugin } = await import("../index")
const { loadSessionState } = await import("../lib/state")
const { logger } = await import("./hierarchical-fixture")
await mkdir(process.env.OPENCODE_CONFIG_DIR, { recursive: true })
await writeFile(join(process.env.OPENCODE_CONFIG_DIR, "dcp.json"), JSON.stringify(config()))

test("V1 entrypoint serializes main/child calls and transformations across fresh plugin instances", async () => {
    const main = await fixture()
    const child = await fixture("xml", true)
    const sessions = new Map([[main.sessionID, main], [child.sessionID, child]])
    const client = {
        session: {
            messages: async ({ path }: { path: { id: string } }) => ({ data: structuredClone(sessions.get(path.id)!.messages) }),
            get: async ({ path }: { path: { id: string } }) => ({ data: { parentID: path.id === child.sessionID ? main.sessionID : null } }),
            prompt: async () => ({ data: {} }),
        },
    }
    async function initialize() {
        const hooks = await plugin.server({ client, directory: root } as any)
        const hostConfig: any = {}
        await hooks.config!(hostConfig)
        assert.equal(hostConfig.permission.compress, "allow")
        assert.ok(!hostConfig.experimental?.primary_tools?.includes("compress"))
        assert.ok("sources" in hooks.tool!.compress.args.content.element.shape)
        return hooks
    }
    const hooks = await initialize()
    await Promise.all([
        main.compress([{ sources: [main.ref(main.first)], summary: verbose("MAIN FIRST VERSION", 20) }], false, hooks.tool!.compress),
        child.compress([{ sources: [child.ref(child.first)], summary: "CHILD RESULT ONLY" }], false, hooks.tool!.compress),
    ])
    await main.compress([{ sources: [main.blockRef(1)], summary: "MAIN FINAL RESULT" }], false, hooks.tool!.compress)
    for (const instance of [hooks, await initialize()]) {
        const outputs = [main, child].map((f) => ({ messages: structuredClone(f.messages) }))
        await Promise.all(outputs.map((output) => instance["experimental.chat.messages.transform"]!({}, output)))
        const [mainText, childText] = outputs.map((output) => JSON.stringify(output))
        assert.match(mainText!, /MAIN FINAL RESULT/)
        assert.doesNotMatch(mainText!, /MAIN FIRST VERSION|CHILD RESULT ONLY|FIRST RAW/)
        assert.match(childText!, /CHILD RESULT ONLY/)
        assert.doesNotMatch(childText!, /MAIN FINAL RESULT|FIRST RAW/)
    }
})

test("V2 setup registers hierarchical compression, isolates sessions and transforms archived calls", async () => {
    const a = await fixture("compact")
    const b = await fixture("compact")
    const sessions = new Map([[a.sessionID, a], [b.sessionID, b]])
    type Hook = Parameters<Plugin.Context["session"]["hook"]>[1]
    type Definition = Parameters<Parameters<Plugin.Context["tool"]["transform"]>[0]>[0] extends { add(input: infer T): unknown } ? T : never
    const hooks = new Map<string, Hook>()
    let compress!: Definition
    const session = (sessionID: string) => ({ id: sessionID, agent: "build", model: { id: "test", providerID: "test" } })
    function entries(sessionID: string) {
        return sessions.get(sessionID)!.messages.map((message) => ({
            id: message.info.id,
            type: message.info.role,
            time: { created: message.info.time.created },
            agent: "build",
            model: session(sessionID).model,
            text: message.parts.filter((part) => part.type === "text").map((part) => part.text).join("\n"),
            content: message.parts.map((part) => part.type === "tool" ? {
                type: "tool", id: part.callID, name: part.tool,
                state: { ...part.state, content: part.state.status === "completed" ? [{ type: "text", text: part.state.output }] : [] },
            } : part),
        }))
    }
    const ctx = {
        location: { directory: root },
        session: {
            get: async ({ sessionID }: { sessionID: string }) => session(sessionID),
            context: async ({ sessionID }: { sessionID: string }) => entries(sessionID),
            hook: async (kind: string, handler: Hook) => { hooks.set(kind, handler) },
            prompt: async () => { throw new Error("Compression must not create a user turn") },
        },
        agent: { get: async () => ({ data: { permissions: [] } }) },
        model: { transform: async (edit: any) => edit({ list: () => [] }) },
        tool: { transform: async (edit: any) => edit({ add: (definition: Definition) => { compress = definition } }) },
        command: { transform: async (edit: any) => edit({ add() {} }) },
        rpc: { register: async () => {} },
    }
    const dispose = await plugin.setup(ctx as unknown as Plugin.Context)
    assert.ok(compress)
    assert.match(compress.description, /standalone summary/)
    assert.ok("sources" in (compress.input as any).shape.content.element.shape)
    function executor(f: typeof a) {
        return {
            ...f.tool,
            execute: async (input: unknown, context: any) => {
                const result = await compress.execute(input as never, {
                    id: context.callID, sessionID: f.sessionID, messageID: context.messageID,
                    agent: "build", progress: async () => {},
                } as any)
                return result.content as string
            },
        }
    }
    await Promise.all([
        a.compress([{ sources: [a.ref(a.first)], summary: verbose("V2 FIRST VERSION", 20) }], false, executor(a)),
        b.compress([{ sources: [b.ref(b.first)], summary: "V2 OTHER SESSION" }], false, executor(b)),
    ])
    await a.compress([{ sources: [a.blockRef(1)], summary: "V2 FINAL RESULT" }], false, executor(a))
    const savedA = await loadSessionState(a.sessionID, logger)
    const savedB = await loadSessionState(b.sessionID, logger)
    assert.equal(savedA!.prune.messages.blocksById[2]!.summary.includes("V2 FINAL RESULT"), true)
    assert.equal(savedB!.prune.messages.blocksById[1]!.summary.includes("V2 OTHER SESSION"), true)
    assert.ok(!JSON.stringify(savedA).includes("V2 OTHER SESSION"))
    const native = a.messages.flatMap((message) => {
        const content = message.parts.flatMap((part): any[] => part.type === "text" ? [{ type: "text", text: part.text }]
            : part.type === "tool" ? [{ type: "tool-call", id: part.callID, name: part.tool, input: part.state.input }] : [])
        const results = message.parts.flatMap((part): any[] => part.type === "tool" && part.state.status === "completed"
            ? [{ type: "tool-result", id: part.callID, name: part.tool, result: { type: "text", value: part.state.output } }] : [])
        return [{ id: message.info.id, role: message.info.role, content }, ...(results.length ? [{ role: "tool", content: results }] : [])]
    })
    const event: any = {
        sessionID: a.sessionID, agent: "build", model: session(a.sessionID).model,
        messages: native, system: [], tools: { compress: {} },
    }
    await hooks.get("context")!(event)
    const view = JSON.stringify(event.messages)
    assert.match(view, /V2 FINAL RESULT/)
    assert.match(view, /DCP-edited history/)
    assert.doesNotMatch(view, /V2 FIRST VERSION|FIRST RAW|V2 OTHER SESSION/)
    assert.match(JSON.stringify(event.system), /only when an explicit DCP compression reminder/)
    dispose?.()
})

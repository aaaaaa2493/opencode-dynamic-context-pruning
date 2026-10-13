import assert from "node:assert/strict"
import test from "node:test"
import { mkdtempSync, rmSync } from "node:fs"
import { readFile, mkdir, rename, readdir } from "node:fs/promises"
import { join } from "node:path"
import { tmpdir } from "node:os"
import type { IdFormat } from "../lib/message-ids"
import type { SessionState } from "../lib/state"

const root = mkdtempSync(join(tmpdir(), "dcp-hierarchical-"))
process.env.XDG_DATA_HOME = join(root, "data")
process.env.XDG_CONFIG_HOME = join(root, "config")
process.env.OPENCODE_CONFIG_DIR = join(root, "config", "opencode")
test.after(() => rmSync(root, { recursive: true, force: true }))

const { fixture, addTool, skillResult, verbose, logger } = await import("./hierarchical-fixture")
const { saveSessionState, loadSessionState, checkSession } = await import("../lib/state")
const { serializePruneMessagesState, loadPruneMessagesState } = await import("../lib/state/utils")
const { createExclusiveRunner } = await import("../lib/exclusive")
const { formatCompressionHistoryAnnotation } = await import("../lib/compress/history-annotation")
const { buildCompressedBlockGuidance } = await import("../lib/prompts/extensions/nudge")
const { buildProtectedToolsExtension } = await import("../lib/prompts/extensions/system")
const { systemPrompt } = await import("../lib/prompts/system")
const { createCompressRangeTool } = await import("../lib/compress")
const storage = join(process.env.XDG_DATA_HOME, "opencode/storage/plugin/dcp")
const active = (state: SessionState) => [...state.prune.messages.activeBlockIds].sort((a, b) => a - b)
const graph = (state: SessionState) => JSON.parse(JSON.stringify(serializePruneMessagesState(state.prune.messages)))

for (const format of ["xml", "compact"] as IdFormat[]) {
    test(`${format}: public range executor exposes hierarchical selection`, async () => {
        const f = await fixture(format)
        const publicTool = createCompressRangeTool(f.ctx)
        assert.ok("sources" in publicTool.args.content.element.shape)
        assert.equal(publicTool.args.content.element.shape.startId.isOptional(), true)
        assert.match(publicTool.description, /sources\?: string\[\]/)
        assert.doesNotMatch(publicTool.description, /will be replaced with the full stored/)
    })

    test(`${format}: three generations shrink, retain versions, and reload`, async () => {
        const f = await fixture(format)
        await f.compress([{ sources: [f.ref(f.first), f.ref(f.last)], summary: verbose("FIRST SUMMARY", 40) }])
        await f.compress([{ sources: [f.blockRef(1)], summary: verbose("SECOND SUMMARY", 10) }])
        await f.compress([{ sources: [f.blockRef(2)], summary: "FINAL SUMMARY: preserve confirmed behavior and next steps." }])
        const blocks = [...f.state.prune.messages.blocksById.values()]
        assert.equal(blocks.length, 3)
        assert.ok(blocks[0]!.summaryTokens > blocks[1]!.summaryTokens)
        assert.ok(blocks[1]!.summaryTokens > blocks[2]!.summaryTokens)
        assert.deepEqual(blocks[2]!.consumedBlockIds, [2])
        assert.deepEqual(active(f.state), [3])
        assert.match(JSON.stringify(f.visible()), /FINAL SUMMARY/)
        assert.doesNotMatch(JSON.stringify(f.visible()), /FIRST SUMMARY|SECOND SUMMARY|FIRST RAW|LAST RAW/)
        assert.deepEqual(active(await f.restart()), [3])
        assert.match(JSON.stringify(f.messages), /FIRST SUMMARY|FIRST RAW/)
    })

    test(`${format}: nonadjacent sources preserve intervening messages and last anchor`, async () => {
        const f = await fixture(format)
        await f.compress([{ sources: [f.ref(f.last), f.ref(f.first)], summary: "Confirmed the first and last investigations." }])
        const block = f.state.prune.messages.blocksById.get(1)!
        assert.equal(block.anchorMessageId, f.last.info.id)
        assert.deepEqual(block.sourceRefs, [f.ref(f.first), f.ref(f.last)])
        const visible = f.visible()
        assert.ok(visible.some((m) => m.info.id === f.middle.info.id))
        assert.ok(!visible.some((m) => m.info.id === f.first.info.id))
        await f.compress([{ startId: f.ref(f.middle), endId: f.blockRef(1), summary: "Confirmed both investigations and the intermediate details." }])
        assert.deepEqual(f.state.prune.messages.blocksById.get(2)!.consumedBlockIds, [1])
        assert.ok(!f.visible().some((m) => m.info.id === f.middle.info.id))
    })

    test(`${format}: a failed batch is atomic on disk and in memory`, async () => {
        const f = await fixture(format)
        await saveSessionState(f.state, logger)
        const before = graph(f.state)
        const stats = { ...f.state.stats }
        const file = join(storage, `${f.sessionID}.json`)
        const disk = await readFile(file, "utf8")
        await assert.rejects(f.compress([
            { sources: [f.ref(f.first)], summary: "Valid first replacement." },
            { sources: [f.ref(f.last)], summary: verbose("TOO LONG", 600) },
        ]), /must shrink/)
        assert.deepEqual(graph(f.state), before)
        assert.deepEqual(f.state.stats, stats)
        assert.equal(await readFile(file, "utf8"), disk)
        await f.compress([
            { sources: [f.ref(f.first)], summary: "First findings." },
            { sources: [f.ref(f.last)], summary: "Last findings." },
        ])
        assert.deepEqual(active(await f.restart()), [1, 2])
    })

    test(`${format}: rejects invalid, duplicate, hidden and conflicting selections`, async () => {
        const f = await fixture(format)
        const first = f.ref(f.first)
        for (const content of [
            [{ sources: [], summary: "Invalid." }],
            [{ sources: ["missing"], summary: "Invalid." }],
            [{ sources: [first, first], summary: "Invalid." }],
            [{ sources: [first], startId: first, endId: first, summary: "Invalid." }],
            [{ startId: first, summary: "Invalid." }],
            [{ startId: f.ref(f.last), endId: first, summary: "Invalid." }],
            [{ sources: [first], summary: "A." }, { sources: [first], summary: "B." }],
            [{ sources: [first], summary: " " }],
            [{ sources: [first], summary: "Copy (b1)." }],
            [{ sources: [first], summary: "Copy @b1@." }],
            [{ sources: [first], summary: formatCompressionHistoryAnnotation(1) }],
            [{ sources: [first], summary: "[Summary stored in DCP block b1; earlier versions are archived.]" }],
        ]) await assert.rejects(f.compress(content))
        assert.equal(f.state.prune.messages.blocksById.size, 0)
        await f.compress([{ sources: [first], summary: verbose("BLOCK", 20) }])
        await assert.rejects(f.compress([{ sources: [first], summary: "Hidden raw." }]), /not visible/)
        await assert.rejects(f.compress([{ sources: [f.blockRef(1)], summary: "Cancelled." }], true), /abort/i)
        assert.deepEqual(active(f.state), [1])
    })

    test(`${format}: unfinished calls reject; completed calls and results disappear together`, async () => {
        const f = await fixture(format)
        const part = addTool(f.first, "read", "Original tool output")
        part.state = { status: "running", input: {}, time: { start: 1 } }
        await assert.rejects(f.compress([{ sources: [f.ref(f.first)], summary: "Unsafe." }]), /unfinished/)
        part.state = { status: "completed", input: { path: "original" }, output: "Original tool output", title: "Read", metadata: {}, time: { start: 1, end: 2 } }
        addTool(f.middle, "read", "Unselected tool result")
        await f.compress([{ sources: [f.ref(f.first)], summary: "Confirmed the file findings." }])
        const visible = JSON.stringify(f.visible())
        assert.doesNotMatch(visible, /Original tool output|"path":"original"/)
        assert.match(visible, /Unselected tool result/)
    })

    test(`${format}: task/subagent results are summarized even with wildcard and cached protection`, async () => {
        const f = await fixture(format)
        f.cfg.compress.protectedTools = ["*"]
        const task = addTool(f.first, "task", verbose("TASK RESULT"))
        addTool(f.last, "subagent", "SMALL SUBAGENT RESULT")
        addTool(f.first, "skill", "Useful protected instructions")
        f.state.subAgentResultCache.set(task.callID, "CACHED TASK EXPANSION")
        await f.compress([{ sources: [f.ref(f.first), f.ref(f.last)], summary: verbose("Summarized delegated findings", 20) }])
        const first = f.state.prune.messages.blocksById.get(1)!
        assert.doesNotMatch(first.summary, /TASK RESULT|SUBAGENT RESULT|CACHED TASK/)
        assert.match(first.summary, /Useful protected instructions/)
        first.protectedEntries!.push({ tool: "task", text: "INHERITED TASK RESULT", messageId: f.first.info.id, partIndex: 1, createdAt: 2 })
        await f.compress([{ sources: [f.blockRef(1)], summary: "Delegated findings remain confirmed." }])
        assert.doesNotMatch(f.state.prune.messages.blocksById.get(2)!.summary, /INHERITED TASK/)
        await f.command("decompress", 2)
        await f.command("decompress", 1)
        assert.match(JSON.stringify(f.visible()), /TASK RESULT|SMALL SUBAGENT RESULT/)
    })

    test(`${format}: skill identity ignores sampled files and retains the newest original`, async () => {
        const f = await fixture(format)
        f.cfg.compress.protectedTools = ["skill"]
        addTool(f.first, "skill", skillResult(["old", "same"]))
        const newest = skillResult(["same", "new"])
        addTool(f.last, "skill", newest)
        const different = skillResult(["other"], "Changed instructions.")
        addTool(f.first, "skill", different)
        await f.compress([{ sources: [f.ref(f.first)], summary: verbose("Earlier findings", 20) }])
        await f.compress([{ sources: [f.blockRef(1), f.ref(f.last)], summary: "Consolidated confirmed findings." }])
        const block = f.state.prune.messages.blocksById.get(2)!
        assert.equal(block.protectedEntries!.filter((entry) => entry.tool === "skill").length, 2)
        assert.ok(block.summary.includes(newest))
        assert.ok(block.summary.includes(different))
        assert.ok(!block.summary.includes("<file>old</file>"))
        assert.ok(f.state.prune.messages.blocksById.get(1)!.summary.includes("<file>old</file>"))
    })

    test(`${format}: latest todo uses original chronology, including an empty read`, async () => {
        const f = await fixture(format)
        f.cfg.compress.protectedTools = ["todowrite", "todoread"]
        addTool(f.first, "todowrite", '[{"content":"old","status":"pending"}]')
        addTool(f.last, "todoread", "[]")
        await f.compress([{ sources: [f.ref(f.last)], summary: verbose("Later findings", 20) }])
        await f.compress([{ sources: [f.ref(f.first)], summary: verbose("Earlier findings", 20) }])
        await f.compress([{ sources: [f.blockRef(2), f.blockRef(1)], summary: "Combined confirmed findings." }])
        const block = f.state.prune.messages.blocksById.get(3)!
        assert.equal(block.protectedEntries!.length, 1)
        assert.equal(block.protectedEntries![0]!.tool, "todoread")
        assert.equal(block.protectedEntries![0]!.messageId, f.last.info.id)
        assert.doesNotMatch(block.summary, /"content":"old"/)
        assert.match(block.summary, /\n\[\]/)
        const restored = await f.restart()
        assert.deepEqual(restored.prune.messages.blocksById.get(3)!.protectedEntries, block.protectedEntries)
    })

    test(`${format}: typed protection survives missing originals; legacy reconstruction rejects missing history`, async () => {
        const f = await fixture(format)
        f.cfg.compress.protectedTools = ["skill"]
        addTool(f.first, "skill", "PROTECTED INSTRUCTIONS")
        await f.compress([{ sources: [f.ref(f.first), f.ref(f.last)], summary: verbose("Saved findings", 20) }])
        f.messages.splice(f.messages.indexOf(f.first), 1)
        await f.compress([{ sources: [f.blockRef(1)], summary: verbose("Shortened findings", 5) }])
        assert.match(f.state.prune.messages.blocksById.get(2)!.summary, /PROTECTED INSTRUCTIONS/)
        const block = f.state.prune.messages.blocksById.get(2)!
        delete block.protectedEntries
        const before = graph(f.state)
        await assert.rejects(f.compress([{ sources: [f.blockRef(2)], summary: "Further shortening." }]), /Original message unavailable/)
        assert.deepEqual(graph(f.state), before)
    })

    test(`${format}: protects prompt payloads without accumulating copies and counts their overhead`, async () => {
        const f = await fixture(format)
        f.cfg.compress.protectTags = true
        const prompt = f.add("<protect>EXACT PROTECTED REQUIREMENT</protect>", "user")
        await f.compress([{ sources: [f.ref(f.first), f.ref(prompt)], summary: verbose("Original findings", 20) }])
        await f.compress([{ sources: [f.blockRef(1)], summary: "Confirmed findings and next steps." }])
        assert.equal(f.state.prune.messages.blocksById.get(2)!.summary.split("EXACT PROTECTED REQUIREMENT").length, 2)
        f.cfg.compress.protectedTools = ["skill"]
        const protectedOnly = f.add("")
        addTool(protectedOnly, "skill", "Verbatim required instructions")
        await assert.rejects(f.compress([{ sources: [f.ref(protectedOnly)], summary: verbose("Overhead", 20) }]), /must shrink/)
    })

    test(`${format}: legacy combined strings migrate without splitting embedded task headings`, async () => {
        const f = await fixture(format)
        f.cfg.compress.protectedTools = ["skill", "todowrite", "task"]
        addTool(f.first, "task", "Delegated text\n### Tool: skill\nFAKE EMBEDDED SKILL")
        addTool(f.first, "skill", "REAL SKILL INSTRUCTIONS")
        addTool(f.last, "todowrite", "[]")
        await f.compress([{ sources: [f.ref(f.first), f.ref(f.last)], summary: verbose("Legacy narrative", 20) }])
        const block = f.state.prune.messages.blocksById.get(1)!
        delete block.protectedEntries
        block.protectedContent = [block.protectedContent!.join("")]
        await f.compress([{ sources: [f.blockRef(1)], summary: "Delegated findings remain confirmed." }])
        const next = f.state.prune.messages.blocksById.get(2)!
        assert.match(next.summary, /REAL SKILL INSTRUCTIONS/)
        assert.doesNotMatch(next.summary, /FAKE EMBEDDED SKILL/)
        assert.equal(next.protectedEntries!.length, 2)
    })

    test(`${format}: historical call summaries are annotated only in model copies`, async () => {
        const f = await fixture(format)
        await f.compress([
            { sources: [f.ref(f.first)], summary: verbose("FIRST STORED SUMMARY", 10) },
            { sources: [f.ref(f.last)], summary: verbose("SECOND STORED SUMMARY", 10) },
        ])
        await f.compress([{ sources: [f.blockRef(1), f.blockRef(2)], summary: "NEW ACTIVE SUMMARY." }])
        const view = JSON.stringify(f.visible())
        assert.match(view, /DCP-edited history/)
        assert.match(view, /original stored as b1/)
        assert.match(view, /original stored as b2/)
        assert.doesNotMatch(view, /FIRST STORED SUMMARY|SECOND STORED SUMMARY/)
        assert.match(JSON.stringify(f.messages), /FIRST STORED SUMMARY|SECOND STORED SUMMARY/)
        assert.match(view, /NEW ACTIVE SUMMARY/)
    })

    test(`${format}: decompression restores children and recompression rejects alternative branches`, async () => {
        const f = await fixture(format)
        await f.compress([{ sources: [f.ref(f.first)], summary: verbose("Child findings", 20) }])
        await f.compress([{ sources: [f.blockRef(1)], summary: "Parent findings." }])
        await f.command("decompress", 2)
        assert.deepEqual(active(f.state), [1])
        await f.command("recompress", 2)
        assert.deepEqual(active(await f.restart()), [2])
        await f.command("decompress", 2)
        await f.command("decompress", 1)
        await f.compress([{ sources: [f.ref(f.first)], summary: "Alternate branch findings." }])
        await f.command("recompress", 2)
        assert.deepEqual(active(f.state), [3])
        assert.match(JSON.stringify(f.notices), /overlaps active compression/)
    })

    test(`${format}: native compaction archives versions without reusing IDs`, async () => {
        const f = await fixture(format)
        await f.compress([{ sources: [f.ref(f.first)], summary: "Old confirmed findings." }])
        const compacted = f.add("Native summary")
        if (compacted.info.role === "assistant") compacted.info.summary = true
        await checkSession(f.client, f.state, logger, f.messages, false)
        assert.equal(f.state.prune.messages.blocksById.get(1)!.archived, true)
        assert.deepEqual(active(f.state), [])
        const newRaw = f.add(verbose("New work"))
        await f.compress([{ sources: [f.ref(newRaw)], summary: "New confirmed findings." }])
        assert.deepEqual(active(await f.restart()), [2])
        await f.command("recompress", 1)
        assert.deepEqual(active(f.state), [2])
    })

    test(`${format}: chat reports do not create a new user turn and fallback reports are pruned`, async () => {
        const f = await fixture(format)
        f.cfg.pruneNotification = "detailed"
        f.cfg.compress.showCompression = true
        const result = await f.compress([{ sources: [f.ref(f.first)], summary: "Displayed confirmed findings." }])
        assert.equal(f.notices.length, 0)
        if (format === "xml") {
            assert.equal(f.reports.length, 1)
            assert.match(JSON.stringify(f.reports), /dcpCompressionReport/)
            assert.doesNotMatch(String(result), /▣ DCP/)
        } else {
            assert.equal(f.reports.length, 0)
            assert.match(String(result), /▣ DCP/)
            assert.doesNotMatch(JSON.stringify(f.visible()), /▣ DCP/)
        }
    })
}

test("atomic storage failure rolls back and a later retry succeeds", async () => {
    const f = await fixture()
    await saveSessionState(f.state, logger)
    const file = join(storage, `${f.sessionID}.json`)
    await rename(file, `${file}.saved`)
    await mkdir(file)
    const before = graph(f.state)
    const stats = { ...f.state.stats }
    await assert.rejects(f.compress([{ sources: [f.ref(f.first)], summary: "Save fails." }]))
    assert.deepEqual(graph(f.state), before)
    assert.deepEqual(f.state.stats, stats)
    assert.equal((await readdir(storage)).some((name) => name.endsWith(".tmp")), false)
    rmSync(file, { recursive: true })
    await rename(`${file}.saved`, file)
    await f.compress([{ sources: [f.ref(f.first)], summary: "Save succeeds." }])
    assert.deepEqual(active(await f.restart()), [1])
})

test("ordered saves snapshot their values and immediate loads wait for the latest write", async () => {
    const f = await fixture()
    f.state.stats.totalPruneTokens = 1
    const first = saveSessionState(f.state, logger)
    f.state.stats.totalPruneTokens = 2
    const second = saveSessionState(f.state, logger)
    const loaded = await loadSessionState(f.sessionID, logger)
    await Promise.all([first, second])
    assert.equal(loaded!.stats.totalPruneTokens, 2)
})

test("exclusive operations serialize state and recover after rejection", async () => {
    const exclusive = createExclusiveRunner()
    const events: number[] = []
    const run = exclusive(async (value: number) => {
        events.push(value)
        await new Promise((resolve) => setTimeout(resolve, 5))
        events.push(value)
        if (value === 1) throw new Error("Expected failure")
    })
    const first = run(1)
    const second = run(2)
    await assert.rejects(first, /Expected failure/)
    await second
    assert.deepEqual(events, [1, 1, 2, 2])
})

test("restoring typed payloads preserves provenance and rejects malformed entries", () => {
    const restored = loadPruneMessagesState({ blocksById: {
        1: { blockId: 1, summary: "Stored", protectedEntries: [{ text: "Instructions", tool: "skill", messageId: "m", createdAt: 1, partIndex: 2 }] },
        2: { blockId: 2, summary: "Malformed", protectedEntries: [{ text: "Bad", messageId: "m", createdAt: "wrong", partIndex: 2 }] },
    } })
    assert.equal(restored.blocksById.get(1)!.protectedEntries![0]!.partIndex, 2)
    assert.equal(restored.blocksById.get(2)!.protectedEntries, undefined)
})

test("guidance requires a DCP/user trigger and never advertises placeholder expansion", async () => {
    for (const format of ["xml", "compact"] as IdFormat[]) {
        const f = await fixture(format)
        assert.match(systemPrompt(format), /only when an explicit DCP compression reminder/)
        assert.match(systemPrompt(format), /do not independently trigger compression/)
        assert.doesNotMatch(systemPrompt(format), /Manage context continuously|signal-to-noise REGULARLY/)
        assert.match(buildCompressedBlockGuidance(f.state), /rewrite their useful content/)
    }
    const protectedTools = buildProtectedToolsExtension(["task", "subagent", "skill"])
    assert.doesNotMatch(protectedTools, /`task`|`subagent`/)
    assert.match(protectedTools, /Important outputs from subagents must be included/)
})

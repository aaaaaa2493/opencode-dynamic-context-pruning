# Hierarchical DCP fork

Based on the upstream **3.2.0** series, checkout `f8232fd`. The hierarchical
changes were migrated on October 13, 2026 from the local 3.1.15-based fork
(`11f6517780a502512a3467645074be447cb0369e`). The upstream AGPL-3.0-or-later
license is retained; see [LICENSE](LICENSE).

## Compression contract

The default `compress.mode: "range"` uses hierarchical compression in both
OpenCode V1 and V2. The model rewrites selected summaries into a genuinely
smaller standalone summary, instead of expanding references to them.

```json
{
    "topic": "Completed investigation",
    "content": [
        {
            "sources": ["b1", "m0042", "b3"],
            "summary": "Confirmed findings, constraints, decisions and next steps."
        }
    ]
}
```

IDs are illustrative; select only IDs visible in the current conversation.
V1 uses `mNNNN` and `bN`. V2 uses whole markers such as `@42@` and `@b1@`.
An entry may alternatively specify `startId`/`endId` for an inclusive visible
range. Never combine `sources` and range boundaries in the same entry.

- Raw messages and active summary blocks can be mixed, including nonadjacent sources.
- Whole messages are selected, keeping tool calls and results together.
- Unselected messages stay in place; replacement is anchored at the last source.
- Old narratives are rewritten by the model, never appended automatically.
  `(bN)` and `@bN@` placeholders are rejected.
- Current tool-call messages, unfinished calls, hidden IDs, overlapping selections,
  duplicate sources and empty summaries are rejected.
- Each replacement must shrink after pruning, protection and wrapper overhead.
  This is a DCP token estimate, not a provider billing measurement.
- The entire batch is validated before changing the compression graph.

The optional `message` mode retains upstream message selection and uses the
same tool-protection and notification policies.

## Compression triggers

The bundled system prompt instructs the model to compress only after an explicit
DCP compression reminder or an explicit user/manual request. A completed work
phase, the model's own token estimate, or perceived context pressure is not an
independent trigger. Completion criteria decide **what** to summarize after a
trigger. This is model-facing guidance, not a new server-side permission gate.

Existing `dcp.jsonc` options and thresholds continue to apply; the migration does
not change the schema. The existing local setup's minimum/maximum context
thresholds remain 220,000/320,000 tokens. Turn and iteration reminders remain
available according to their existing settings.

Custom prompt overrides are supported. An old custom system/range prompt may
override the bundled guidance; update it to the hierarchical contract if used.

## Protected data

New blocks store typed `protectedEntries` with the original message ID, creation
time, part index and tool name, alongside legacy `protectedContent` strings.

- `task` (V1) and `subagent` (V2) findings must be summarized by the model. Their
  outputs are never automatically copied verbatim, even under old explicit or
  wildcard protection, cached expansion or inherited typed payloads.
- Skills with the same name, base directory and instructions deduplicate despite
  sampled or reordered terminal `skill_files` lists. The newest original output
  remains verbatim. Different instructions/names/paths and unknown formats stay distinct.
- Each replacement retains one latest protected todo snapshot across reads and
  writes, including an empty list. Original message/part order decides "latest";
  block creation time, anchors and input order do not.
- Other configured tools, file-pattern protections, prompt tags and user messages
  retain protection. V2 metadata-aware Code Mode protection is retained.
- Legacy strings are reconstructed from original parts on rewrite, without parsing
  headings inside arbitrary tool output. Missing required originals cause rejection
  before mutation. Typed entries can be inherited without the original parts.

## History, persistence and restoration

Earlier versions remain in `blocksById` with `sourceRefs`, parent links,
`consumedBlockIds` and original message IDs. Model-facing copies of successful
historical compression calls replace duplicate summary arguments with explicit
`DCP-edited history` annotations. Raw host history is untouched; failed and
untracked calls remain intact. An annotation alone cannot replace a summary.

The existing session store is retained:

```text
~/.local/share/opencode/storage/plugin/dcp/<sessionId>.json
```

`XDG_DATA_HOME` overrides the base directory. Writes use temporary files and
atomic rename; queues preserve invocation order, and loads wait for queued writes.
A failed batch save rolls back the graph and counters. V1 state-sensitive hooks
and tools are serialized; V2 retains upstream per-session state and queues.
These queues coordinate one plugin process, not multiple host processes sharing
the same session file.

`/dcp decompress <n>` restores the preceding layer. `/dcp recompress <n>` re-applies
a user-decompressed version; an overlapping alternative active branch blocks it.
Actual rewriting is done by the model's `compress` tool. Native compaction archives
old blocks without reusing IDs or reactivating them. The archive is not a separate
backup of raw host messages, and there is no model-facing recall tool.

## Notifications

Reports show cumulative created summary tokens, including rewritten and archived
generations. Removed tokens include consumed summaries. Per-operation metrics
list messages and summaries separately.

V1 chat reports are marked, fenced text parts of the existing assistant message,
added through the host's authenticated part-update transport. If updating the
part fails, the report falls back to tool output. V2 chat reports use tool output
because its public API has no part-update endpoint. Neither path creates a new
user turn. Report parts/fallback text are stripped from subsequent model context;
the host retains them for display. `toast` and `off` keep their existing behavior.

## Install on any computer

Use the prebuilt package from GitHub Releases. OpenCode handles installation and
dependencies; users do not need Git, a checkout, or a manual Node/npm build.

For V1, replace the existing DCP entry in both `opencode.jsonc` and `tui.json`:

```jsonc
"plugin": [
    "https://github.com/aaaaaa2493/opencode-dynamic-context-pruning/releases/latest/download/opencode-dcp-hierarchical.tgz"
]
```

For V2, use the same URL as the `package` in `plugins`, or run `opencode plugin add`
with that URL. See [README.md](README.md#installation) for complete examples.
Preserve other plugins/settings and restart OpenCode. `compress.mode: "range"`
selects hierarchical behavior; the existing `dcp.jsonc` configuration still applies.

The Publish workflow builds, tests, verifies and packs every master update before
publishing a GitHub release. The package has its own name,
`@aaaaaa2493/opencode-dcp`. No npm registry login or package build is needed on
consumer computers. A release-specific asset URL pins a particular build.

## Local development and verification

This fork uses upstream package entrypoints: `main` and server exports point to
`dist/index.js`, unlike the old local-only source installation.

```sh
npm ci --legacy-peer-deps
npm run typecheck
npm run test:hierarchical
npm test
npm run check:package
```

Hierarchical regressions cover both ID formats, three-generation rewrites, mixed
selections, protections, restoration, atomic persistence, native compaction,
historical calls, reports and V1/V2 plugin registration. Tests use temporary
config/storage and mocked hosts without live accounts. Node 24 can also run the
TypeScript suites through `tests/register-typescript.mjs`.

For local development, after building replace only the existing DCP plugin entry with this checkout's
absolute path. For the current V1 setup, use this entry in both
`~/.config/opencode/opencode.jsonc` and `~/.config/opencode/tui.json`:

```jsonc
"plugin": ["/mnt/d/GitHub/opencode-dynamic-context-pruning"]
```

Preserve other entries/settings. V2 installation is documented in
[CONTRIBUTING.md](CONTRIBUTING.md#local-installation). The upstream cache updater
is disabled in this fork. **Quit and restart OpenCode** after connecting or editing
plugin/configuration files; running sessions keep their previously loaded code.

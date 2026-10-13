import assert from "node:assert/strict"
import test from "node:test"
import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const archive = join(root, "release/opencode-dcp-hierarchical.tgz")

test("release archive provides a build-free Git package and both host entrypoints", async () => {
    // Keep extraction under the checkout to reuse the CI-installed host SDKs.
    const temporary = mkdtempSync(join(root, ".package-test-"))
    try {
        execFileSync("tar", ["-xzf", archive, "-C", temporary])
        const directory = join(temporary, "package")
        execFileSync(process.execPath, [join(root, "scripts/prepare-package.mjs"), directory])
        const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"))
        assert.equal(manifest.name, "@aaaaaa2493/opencode-dcp")
        assert.equal(manifest.scripts, undefined)
        assert.equal(manifest.devDependencies, undefined)
        assert.equal(manifest.workspaces, undefined)
        assert.equal(manifest.exports["./server"].import, "./dist/index.js")
        assert.equal(manifest.exports["./tui"].import, "./tui.tsx")
        for (const name of [".", "./server", "./tui"]) {
            assert.ok(existsSync(join(directory, manifest.exports[name].import)))
            assert.ok(existsSync(join(directory, manifest.exports[name].types)))
        }
        assert.ok(!existsSync(join(directory, "node_modules")))
        assert.ok(!existsSync(join(directory, "tests")))
        assert.ok(!existsSync(join(directory, "index.ts")))
        const server = await import(pathToFileURL(join(directory, manifest.exports["./server"].import)).href)
        assert.equal(server.default.id, "opencode-dcp")
        assert.equal(typeof server.default.server, "function")
        assert.equal(typeof server.default.setup, "function")
        const bundled = readFileSync(join(directory, manifest.main), "utf8")
        assert.match(bundled, /Sources? .*not visible\/active|Specify either sources/)
        assert.match(bundled, /only when an explicit DCP compression reminder/)
    } finally {
        rmSync(temporary, { recursive: true, force: true })
    }
})

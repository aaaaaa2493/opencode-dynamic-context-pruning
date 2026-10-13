import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// Git consumers receive the already-built npm payload, without development
// workspaces or lifecycle/build scripts. OpenCode installs only runtime dependencies.
const filename = join(process.argv[2], "package.json")
const manifest = JSON.parse(readFileSync(filename, "utf8"))
delete manifest.workspaces
delete manifest.devDependencies
delete manifest.scripts
writeFileSync(filename, JSON.stringify(manifest, null, 4) + "\n")

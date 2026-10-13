// Node 24 test-only loader; production entrypoints are built normally.
import { registerHooks } from "node:module"
import { readFileSync } from "node:fs"
import ts from "typescript"

registerHooks({
    resolve(specifier, context, nextResolve) {
        try {
            return nextResolve(specifier, context)
        } catch (error) {
            if (!specifier.startsWith(".") || !["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"].includes(error.code)) throw error
            for (const suffix of [".ts", "/index.ts", ".js", "/index.js"]) {
                try {
                    return nextResolve(specifier + suffix, context)
                } catch (candidateError) {
                    if (candidateError.code !== "ERR_MODULE_NOT_FOUND") throw candidateError
                }
            }
            throw error
        }
    },
    load(url, context, nextLoad) {
        if (!url.endsWith(".ts")) return nextLoad(url, context)
        return {
            format: "module",
            shortCircuit: true,
            source: ts.transpileModule(readFileSync(new URL(url), "utf8"), {
                compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
                fileName: url,
            }).outputText,
        }
    },
})

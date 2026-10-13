const HISTORY_PREFIX = "[DCP-edited history, not original input: summary omitted after successful compression to avoid duplication; original stored as b"
const HISTORY_SUFFIX = ". Active summaries are provided separately. This is expected and requires no corrective compression.]"
const LEGACY_HISTORY_ANNOTATION = /^\[Summary stored in DCP block b\d+; earlier versions are archived\.\]$/

export function formatCompressionHistoryAnnotation(blockId: number): string {
    return `${HISTORY_PREFIX}${blockId}${HISTORY_SUFFIX}`
}

export function isCompressionHistoryAnnotation(summary: string): boolean {
    const text = summary.trim()
    if (LEGACY_HISTORY_ANNOTATION.test(text)) return true
    if (!text.startsWith(HISTORY_PREFIX) || !text.endsWith(HISTORY_SUFFIX)) return false
    return /^\d+$/.test(text.slice(HISTORY_PREFIX.length, -HISTORY_SUFFIX.length))
}

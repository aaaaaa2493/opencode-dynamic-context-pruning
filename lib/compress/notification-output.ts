const NOTIFICATION_MARKER = "\n\n▣ DCP | "

export function appendCompressionNotification(result: string, notification: string | undefined): string {
    return notification ? `${result}\n\n${notification}` : result
}

/** Keep the full report in host history, but only the execution result in model context. */
export function stripCompressionNotification(output: string): string {
    const index = output.indexOf(NOTIFICATION_MARKER)
    return index === -1 ? output : output.slice(0, index)
}

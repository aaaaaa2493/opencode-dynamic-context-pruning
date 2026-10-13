import type { WithParts } from "../state"

export function isCompressionReport(part: WithParts["parts"][number]): boolean {
    return part.type === "text" && part.ignored === true && part.metadata?.dcpCompressionReport === true
}

export async function showCompressionReport(
    client: any,
    sessionID: string,
    messageID: string,
    toolPartID: string,
    report: string,
): Promise<void> {
    const partID = `${toolPartID}_dcp`
    const fence = "`".repeat(Math.max(3, ...[...report.matchAll(/`+/g)].map(([run]) => run.length + 1)))
    const part = {
        id: partID,
        sessionID,
        messageID,
        type: "text" as const,
        text: `${fence}text\n${report}\n${fence}`,
        ignored: true,
        metadata: { dcpCompressionReport: true },
    }
    // V2 has no public message-part update endpoint; keep reports in tool output there.
    const transport = client._client ?? client.client
    if (!transport?.patch) throw new Error("Host client does not support updating message parts")
    await transport.patch({
        url: "/session/{sessionID}/message/{messageID}/part/{partID}",
        path: { sessionID, messageID, partID },
        body: part,
        headers: { "Content-Type": "application/json" },
        throwOnError: true,
    })
}

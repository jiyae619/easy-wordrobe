export type AgentName = "intake" | "stylist" | "behavioral" | "bedrock";

export type AgentFailureReason =
    | "unsafe_content"
    | "schema_invalid"
    | "parse_error"
    | "transport_error"
    | "timeout"
    | "empty_response";

export class AgentError extends Error {
    readonly agent: AgentName;
    readonly reason: AgentFailureReason;
    readonly traceId?: string;
    readonly status?: number;

    constructor(
        agent: AgentName,
        reason: AgentFailureReason,
        message: string,
        options?: { traceId?: string; status?: number; cause?: unknown }
    ) {
        super(message);
        this.name = "AgentError";
        this.agent = agent;
        this.reason = reason;
        this.traceId = options?.traceId;
        this.status = options?.status;
        this.cause = options?.cause;
    }
}

export function getAgentFailureReason(error: unknown): AgentFailureReason {
    if (error instanceof AgentError) {
        return error.reason;
    }
    if (error instanceof DOMException && error.name === "AbortError") {
        return "timeout";
    }
    return "schema_invalid";
}

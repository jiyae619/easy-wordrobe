import { AgentError, type AgentName } from "./agents/agentErrors";
import { createAgentTraceId, recordAgentMetric } from "./agents/agentTelemetry";
import { AI_PROXY_URL, getProxyIdToken } from "./aiProxyClient";

export interface BedrockConversePayload {
    messages: Array<{
        role: string;
        content: Array<Record<string, unknown>>;
    }>;
    inferenceConfig?: {
        maxTokens?: number;
        temperature?: number;
    };
}

export interface BedrockCallOptions {
    agent?: AgentName;
    traceId?: string;
    timeoutMs?: number;
    maxRetries?: number;
}

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 1;

function extractResponseText(result: unknown): string {
    const content = (result as {
        output?: { message?: { content?: Array<{ text?: unknown }> } };
    })?.output?.message?.content;

    if (!Array.isArray(content)) return "";
    return content
        .map((block) => typeof block.text === "string" ? block.text : "")
        .filter(Boolean)
        .join("\n")
        .trim();
}

export function extractJsonFromText(outputText: string): string {
    let jsonStr = outputText.trim();
    if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    const firstObject = jsonStr.indexOf("{");
    const firstArray = jsonStr.indexOf("[");
    const starts = [firstObject, firstArray].filter((idx) => idx >= 0);
    if (starts.length === 0) return jsonStr;

    const start = Math.min(...starts);
    const end = Math.max(jsonStr.lastIndexOf("}"), jsonStr.lastIndexOf("]"));
    return end >= start ? jsonStr.slice(start, end + 1).trim() : jsonStr;
}

function isRetryableStatus(status: number): boolean {
    return status === 429 || status >= 500;
}

/**
 * Shared helper to call the Bedrock Converse API with a given payload.
 */
export async function callBedrockConverseAPI(
    payload: BedrockConversePayload,
    options: BedrockCallOptions = {}
): Promise<string> {
    const agent = options.agent ?? "bedrock";
    const traceId = options.traceId ?? createAgentTraceId(agent);
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

    if (!AI_PROXY_URL) {
        throw new AgentError(agent, "transport_error", "AI service not configured (missing VITE_AI_PROXY_URL).", { traceId });
    }

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const startedAt = performance.now();
        const controller = new AbortController();
        const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);

        recordAgentMetric({ agent, traceId, phase: "bedrock_start", attempt });
        try {
            const idToken = await getProxyIdToken();
            const response = await fetch(AI_PROXY_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`,
                },
                body: JSON.stringify({ target: "bedrock", payload }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                if (attempt < maxRetries && isRetryableStatus(response.status)) {
                    recordAgentMetric({
                        agent,
                        traceId,
                        phase: "bedrock_error",
                        attempt,
                        status: response.status,
                        reason: "transport_error",
                        durationMs: performance.now() - startedAt,
                    });
                    continue;
                }
                throw new AgentError(agent, "transport_error", `Bedrock API error ${response.status}: ${errorText}`, {
                    traceId,
                    status: response.status,
                });
            }

            const result = await response.json();
            const outputText = extractResponseText(result);
            if (!outputText) {
                throw new AgentError(agent, "empty_response", "Bedrock response did not contain output text.", { traceId });
            }

            const jsonStr = extractJsonFromText(outputText);
            recordAgentMetric({
                agent,
                traceId,
                phase: "bedrock_success",
                attempt,
                durationMs: performance.now() - startedAt,
                outputCount: jsonStr.length,
            });
            return jsonStr;
        } catch (error) {
            const timedOut = error instanceof DOMException && error.name === "AbortError";
            const reason = timedOut ? "timeout" : error instanceof AgentError ? error.reason : "transport_error";
            recordAgentMetric({
                agent,
                traceId,
                phase: "bedrock_error",
                attempt,
                reason,
                status: error instanceof AgentError ? error.status : undefined,
                durationMs: performance.now() - startedAt,
            });

            if (attempt >= maxRetries || reason === "empty_response") {
                if (error instanceof AgentError) throw error;
                throw new AgentError(agent, reason, timedOut ? "Bedrock request timed out." : "Bedrock request failed.", {
                    traceId,
                    cause: error,
                });
            }
        } finally {
            globalThis.clearTimeout(timer);
        }
    }

    throw new AgentError(agent, "transport_error", "Bedrock request failed after retries.", { traceId });
}

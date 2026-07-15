import { AgentError } from "../agents/agentErrors";
import { recordAgentMetric } from "../agents/agentTelemetry";
import { callBedrockConverseAPI, extractJsonFromText } from "../bedrockClient";
import { AI_PROXY_URL, getProxyIdToken } from "../aiProxyClient";
import type { TextRequest, VisionCallOptions, VisionProvider, VisionRequest } from "./VisionProvider";

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 1;

function formatFromMime(mimeType: string): string {
    const match = /image\/(\w+)/.exec(mimeType);
    return match ? match[1] : "jpeg";
}

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

function isRetryableStatus(status: number): boolean {
    return status === 429 || status >= 500;
}

export const novaProvider: VisionProvider = {
    id: "nova-2-lite",
    label: "AWS Nova 2 Lite",

    isConfigured(): boolean {
        return Boolean(AI_PROXY_URL);
    },

    async call(request: VisionRequest, options: VisionCallOptions): Promise<string> {
        const { agent, traceId } = options;
        const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

        if (!AI_PROXY_URL) {
            throw new AgentError(agent, "transport_error", "AI service not configured (missing VITE_AI_PROXY_URL).", { traceId });
        }

        const payload = {
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            image: {
                                format: formatFromMime(request.mimeType),
                                source: { bytes: request.imageBase64 },
                            },
                        },
                        { text: request.systemPrompt },
                    ],
                },
            ],
            inferenceConfig: {
                maxTokens: request.maxTokens ?? 1024,
                temperature: request.temperature ?? 0.2,
            },
        };

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
                            agent, traceId, phase: "bedrock_error", attempt,
                            status: response.status, reason: "transport_error",
                            durationMs: performance.now() - startedAt,
                        });
                        continue;
                    }
                    throw new AgentError(agent, "transport_error", `Nova API error ${response.status}: ${errorText}`, { traceId, status: response.status });
                }

                const result = await response.json();
                const outputText = extractResponseText(result);
                if (!outputText) {
                    throw new AgentError(agent, "empty_response", "Nova response did not contain output text.", { traceId });
                }

                const jsonStr = extractJsonFromText(outputText);
                recordAgentMetric({
                    agent, traceId, phase: "bedrock_success", attempt,
                    durationMs: performance.now() - startedAt,
                    outputCount: jsonStr.length,
                });
                return jsonStr;
            } catch (error) {
                const timedOut = error instanceof DOMException && error.name === "AbortError";
                const reason = timedOut ? "timeout" : error instanceof AgentError ? error.reason : "transport_error";
                recordAgentMetric({
                    agent, traceId, phase: "bedrock_error", attempt, reason,
                    status: error instanceof AgentError ? error.status : undefined,
                    durationMs: performance.now() - startedAt,
                });

                if (attempt >= maxRetries || reason === "empty_response") {
                    if (error instanceof AgentError) throw error;
                    throw new AgentError(agent, reason, timedOut ? "Nova request timed out." : "Nova request failed.", { traceId, cause: error });
                }
            } finally {
                globalThis.clearTimeout(timer);
            }
        }

        throw new AgentError(agent, "transport_error", "Nova request failed after retries.", { traceId });
    },

    // Text-only path (Stylist / Behavioral). Delegates to the shared Bedrock converse helper —
    // the exact call the text agents used before the registry unification, so behavior is unchanged.
    async callText(request: TextRequest, options: VisionCallOptions): Promise<string> {
        return callBedrockConverseAPI(
            {
                messages: [{ role: "user", content: [{ text: request.prompt }] }],
                inferenceConfig: {
                    maxTokens: request.maxTokens ?? 1000,
                    temperature: request.temperature ?? 0.7,
                },
            },
            options,
        );
    },
};

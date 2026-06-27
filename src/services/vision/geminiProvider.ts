import { AgentError } from "../agents/agentErrors";
import { recordAgentMetric } from "../agents/agentTelemetry";
import { extractJsonFromText } from "../bedrockClient";
import type { VisionCallOptions, VisionProvider, VisionRequest } from "./VisionProvider";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 1;

function geminiUrl(): string {
    return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
}

function extractResponseText(result: unknown): string {
    const parts = (result as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
    })?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(parts)) return "";
    return parts
        .map((p) => typeof p.text === "string" ? p.text : "")
        .filter(Boolean)
        .join("\n")
        .trim();
}

function isRetryableStatus(status: number): boolean {
    return status === 429 || status >= 500;
}

export const geminiProvider: VisionProvider = {
    id: "gemini-2.5-flash",
    label: `Google ${GEMINI_MODEL}`,

    isConfigured(): boolean {
        return Boolean(GEMINI_API_KEY);
    },

    async call(request: VisionRequest, options: VisionCallOptions): Promise<string> {
        const { agent, traceId } = options;
        const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

        if (!GEMINI_API_KEY) {
            throw new AgentError(agent, "transport_error", "Missing VITE_GEMINI_API_KEY in environment variables.", { traceId });
        }

        const payload = {
            contents: [
                {
                    parts: [
                        { inline_data: { mime_type: request.mimeType, data: request.imageBase64 } },
                        { text: request.systemPrompt },
                    ],
                },
            ],
            generationConfig: {
                temperature: request.temperature ?? 0.2,
                maxOutputTokens: request.maxTokens ?? 1024,
                responseMimeType: "application/json",
            },
        };

        for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
            const startedAt = performance.now();
            const controller = new AbortController();
            const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);

            recordAgentMetric({ agent, traceId, phase: "bedrock_start", attempt });
            try {
                const response = await fetch(geminiUrl(), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
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
                    throw new AgentError(agent, "transport_error", `Gemini API error ${response.status}: ${errorText}`, { traceId, status: response.status });
                }

                const result = await response.json();
                const outputText = extractResponseText(result);
                if (!outputText) {
                    throw new AgentError(agent, "empty_response", "Gemini response did not contain output text.", { traceId });
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
                    throw new AgentError(agent, reason, timedOut ? "Gemini request timed out." : "Gemini request failed.", { traceId, cause: error });
                }
            } finally {
                globalThis.clearTimeout(timer);
            }
        }

        throw new AgentError(agent, "transport_error", "Gemini request failed after retries.", { traceId });
    },
};

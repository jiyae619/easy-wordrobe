import { AgentError } from "../agents/agentErrors";
import { recordAgentMetric } from "../agents/agentTelemetry";
import { extractJsonFromText } from "../bedrockClient";
import { AI_PROXY_URL, getProxyIdToken } from "../aiProxyClient";
import type { TextRequest, ThinkingLevel, VisionCallOptions, VisionProvider, VisionRequest } from "./VisionProvider";

const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.5-flash-lite";

const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_MAX_RETRIES = 1;

const THINKING_LEVELS: ThinkingLevel[] = ["minimal", "low", "medium", "high", "default"];
const envThinking = import.meta.env.VITE_GEMINI_THINKING_LEVEL as string | undefined;
/** Thinking level for text calls when the caller does not set one. Override with VITE_GEMINI_THINKING_LEVEL. */
const DEFAULT_TEXT_THINKING: ThinkingLevel = THINKING_LEVELS.includes(envThinking as ThinkingLevel)
    ? envThinking as ThinkingLevel
    : "minimal";

/** Set once the API rejects thinkingConfig for this model, so later calls skip it (no repeat 400s). */
let thinkingConfigRejected = false;

/**
 * Gemini generationConfig.thinkingConfig for a level. Gemini 3.x takes `thinkingLevel`; Gemini 2.x
 * takes a token budget, where 0 turns thinking off on Flash / Flash-Lite (Pro cannot disable it).
 */
function thinkingConfigFor(level: ThinkingLevel): Record<string, unknown> | undefined {
    if (level === "default" || thinkingConfigRejected) return undefined;
    if (/^gemini-2\./.test(GEMINI_MODEL)) {
        if (GEMINI_MODEL.includes("pro")) return undefined;
        const budgets: Record<Exclude<ThinkingLevel, "default">, number> = { minimal: 0, low: 512, medium: 2048, high: 8192 };
        return { thinkingBudget: budgets[level] };
    }
    return { thinkingLevel: level };
}

type GeminiPayload = { generationConfig?: Record<string, unknown> } & Record<string, unknown>;

function withoutThinkingConfig(payload: GeminiPayload): GeminiPayload {
    if (!payload.generationConfig?.thinkingConfig) return payload;
    const generationConfig = { ...payload.generationConfig };
    delete generationConfig.thinkingConfig;
    return { ...payload, generationConfig };
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

/**
 * Shared proxy call + retry + de-fence for any Gemini generateContent body. Both the image path
 * (call) and the text path (callText) build their payload and hand it here, so retry, timeout, and
 * telemetry live in exactly one place.
 */
async function sendGemini(initialPayload: GeminiPayload, options: VisionCallOptions): Promise<string> {
    let payload = initialPayload;
    const { agent, traceId } = options;
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
                body: JSON.stringify({ target: "gemini", model: GEMINI_MODEL, payload }),
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                // A model that does not accept thinkingConfig answers 400 naming the field. Drop it
                // for this and every later call and resend at once (not counted as a retry).
                if (response.status === 400 && payload.generationConfig?.thinkingConfig && /thinking/i.test(errorText)) {
                    thinkingConfigRejected = true;
                    payload = withoutThinkingConfig(payload);
                    attempt -= 1;
                    continue;
                }
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

            const noRetryAfterTimeout = timedOut && options.retryOnTimeout === false;
            if (attempt >= maxRetries || reason === "empty_response" || noRetryAfterTimeout) {
                if (error instanceof AgentError) throw error;
                throw new AgentError(agent, reason, timedOut ? "Gemini request timed out." : "Gemini request failed.", { traceId, cause: error });
            }
        } finally {
            globalThis.clearTimeout(timer);
        }
    }

    throw new AgentError(agent, "transport_error", "Gemini request failed after retries.", { traceId });
}

export const geminiProvider: VisionProvider = {
    id: "gemini",
    label: `Google ${GEMINI_MODEL}`,

    isConfigured(): boolean {
        return Boolean(AI_PROXY_URL);
    },

    async call(request: VisionRequest, options: VisionCallOptions): Promise<string> {
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
        return sendGemini(payload, options);
    },

    // Text-only path (Stylist / Behavioral).
    // Thinking defaults to "minimal" here: these agents return short JSON, and every thinking token
    // is generated (serially) before the answer starts. Intake (call) keeps the model default, which
    // is what the category-accuracy eval measured.
    async callText(request: TextRequest, options: VisionCallOptions): Promise<string> {
        const thinkingConfig = thinkingConfigFor(request.thinking ?? DEFAULT_TEXT_THINKING);
        const payload = {
            contents: [{ parts: [{ text: request.prompt }] }],
            generationConfig: {
                temperature: request.temperature ?? 0.7,
                maxOutputTokens: request.maxTokens ?? 1000,
                responseMimeType: "application/json",
                ...(thinkingConfig ? { thinkingConfig } : {}),
            },
        };
        return sendGemini(payload, options);
    },
};

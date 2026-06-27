import type { AgentName } from "../agents/agentErrors";

/**
 * A normalized vision-model request. Adapters translate this into
 * each vendor's wire format (Bedrock Converse, Gemini generateContent, etc.).
 */
export interface VisionRequest {
    /** Base-64 image bytes WITHOUT the `data:image/...;base64,` prefix. */
    imageBase64: string;
    /** MIME type — `image/jpeg`, `image/png`, `image/webp`. */
    mimeType: string;
    /** Instruction prompt sent alongside the image. */
    systemPrompt: string;
    maxTokens?: number;
    temperature?: number;
}

export interface VisionCallOptions {
    agent: AgentName;
    traceId: string;
    timeoutMs?: number;
    maxRetries?: number;
}

/**
 * Common contract every vision model adapter must satisfy.
 * Adapters return a raw JSON string (already de-fenced and trimmed).
 */
export interface VisionProvider {
    /** Stable identifier used for logging, telemetry, and registry lookup. */
    readonly id: string;
    /** Human label for dev UIs. */
    readonly label: string;
    /** True when the adapter has the credentials it needs to run. */
    isConfigured(): boolean;
    /** Send the request and return the raw JSON string. Throws on failure. */
    call(request: VisionRequest, options: VisionCallOptions): Promise<string>;
}

import { auth } from "./firebaseConfig";

/**
 * Client shim for the server-side AI proxy (Cloud Functions `aiProxy`).
 *
 * The Bedrock / Gemini keys live server-side; the browser authenticates each model call with the
 * signed-in user's Firebase ID token instead. Every AI call site (bedrockClient, novaProvider,
 * geminiProvider) POSTs to this proxy with `{ target, payload, model? }` and receives the raw
 * upstream JSON, so response parsing stays exactly where it was.
 */
export const AI_PROXY_URL = import.meta.env.VITE_AI_PROXY_URL || "";

/** True once the client is wired to the deployed proxy (VITE_AI_PROXY_URL is set). */
export function isProxyConfigured(): boolean {
    return Boolean(AI_PROXY_URL);
}

/**
 * The current user's Firebase ID token, used to authenticate a proxy call.
 * All AI calls happen behind ProtectedRoute, so a user should always be present; if not, we throw
 * a clear error rather than sending an unauthenticated request the proxy would reject anyway.
 */
export async function getProxyIdToken(): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
        throw new Error("Not signed in — cannot reach the AI service.");
    }
    return user.getIdToken();
}

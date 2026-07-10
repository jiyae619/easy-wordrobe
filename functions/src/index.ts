/**
 * StyleMax AI proxy.
 *
 * A thin, authenticated forwarder that keeps the Bedrock / Gemini API keys OFF the client.
 * The browser sends a Firebase ID token (not an API key); this function verifies it,
 * enforces a per-user rate limit, and forwards the request to the upstream model with the
 * real key held server-side in Secret Manager. Response bodies are passed straight back so
 * all parsing stays on the client — this stays a dumb, auditable proxy.
 */
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret, defineString } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();

// Required secret (set with `firebase functions:secrets:set BEDROCK_API_KEY`).
const BEDROCK_API_KEY = defineSecret("BEDROCK_API_KEY");
// Gemini is OPTIONAL (default provider is Nova). To enable the Gemini path in production:
//   1) firebase functions:secrets:set GEMINI_API_KEY
//   2) add `defineSecret("GEMINI_API_KEY")` here and include it in the `secrets: [...]` array below.
// Until then process.env.GEMINI_API_KEY is undefined and the Gemini branch returns 502.

// Non-secret config (override via env / `firebase functions:config` or .env for functions).
const AWS_REGION = defineString("AWS_REGION", { default: "us-east-2" });
const NOVA_MODEL_ID = defineString("NOVA_MODEL_ID", { default: "us.amazon.nova-2-lite-v1:0" });
// Comma-separated allowed browser origins, or "*" (safe here: every request also needs a valid
// Firebase ID token, and we use a Bearer token rather than cookies).
const ALLOWED_ORIGINS = defineString("ALLOWED_ORIGINS", { default: "*" });
// Max AI calls per user per rolling minute — a guardrail against runaway loops / abuse.
const RATE_LIMIT_PER_MIN = defineString("RATE_LIMIT_PER_MIN", { default: "30" });

const UPSTREAM_TIMEOUT_MS = 30_000;
const RATE_WINDOW_MS = 60_000;

function resolveAllowedOrigin(requestOrigin: string | undefined): string {
  const configured = ALLOWED_ORIGINS.value().split(",").map((o) => o.trim()).filter(Boolean);
  if (configured.includes("*")) return "*";
  if (requestOrigin && configured.includes(requestOrigin)) return requestOrigin;
  return configured[0] ?? "*";
}

/**
 * Fixed-window per-user rate limit backed by Firestore (durable across function instances).
 * Returns true if the call is allowed. Fails OPEN on a transient Firestore error so a rare
 * outage doesn't lock out legitimate signed-in users — the error is logged for visibility.
 */
async function isWithinRateLimit(uid: string): Promise<boolean> {
  const limit = Number.parseInt(RATE_LIMIT_PER_MIN.value(), 10) || 30;
  const ref = getFirestore().collection("aiRateLimits").doc(uid);
  const now = Date.now();
  try {
    return await getFirestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data() as { windowStart?: number; count?: number } | undefined;
      if (!data || now - (data.windowStart ?? 0) >= RATE_WINDOW_MS) {
        tx.set(ref, { windowStart: now, count: 1 });
        return true;
      }
      if ((data.count ?? 0) >= limit) return false;
      tx.update(ref, { count: FieldValue.increment(1) });
      return true;
    });
  } catch (err) {
    logger.error("Rate-limit check failed; failing open", { uid, err });
    return true;
  }
}

async function forward(
  url: string,
  headers: Record<string, string>,
  body: string,
): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(url, { method: "POST", headers, body, signal: controller.signal });
    return { status: response.status, text: await response.text() };
  } finally {
    clearTimeout(timer);
  }
}

export const aiProxy = onRequest(
  {
    secrets: [BEDROCK_API_KEY],
    timeoutSeconds: 60,
    memory: "256MiB",
    maxInstances: 10,
  },
  async (req, res) => {
    // --- CORS ---
    res.set("Access-Control-Allow-Origin", resolveAllowedOrigin(req.headers.origin));
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Max-Age", "3600");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    // --- 1. Verify the Firebase ID token ---
    const bearer = /^Bearer (.+)$/.exec(req.headers.authorization ?? "");
    if (!bearer) {
      res.status(401).json({ error: "Missing bearer token" });
      return;
    }
    let uid: string;
    try {
      uid = (await getAuth().verifyIdToken(bearer[1])).uid;
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // --- 2. Per-user rate limit ---
    if (!(await isWithinRateLimit(uid))) {
      res.status(429).json({ error: "Rate limit exceeded. Please slow down and try again." });
      return;
    }

    // --- 3. Route + forward to the upstream model ---
    const body = (req.body ?? {}) as { target?: string; payload?: unknown; model?: string };
    try {
      if (body.target === "bedrock") {
        const url = `https://bedrock-runtime.${AWS_REGION.value()}.amazonaws.com/model/${encodeURIComponent(
          NOVA_MODEL_ID.value(),
        )}/converse`;
        const upstream = await forward(
          url,
          { "Content-Type": "application/json", Authorization: `Bearer ${BEDROCK_API_KEY.value()}` },
          JSON.stringify(body.payload ?? {}),
        );
        res.status(upstream.status).type("application/json").send(upstream.text);
        return;
      }

      if (body.target === "gemini") {
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
          res.status(502).json({ error: "Gemini is not configured on the server" });
          return;
        }
        const model = typeof body.model === "string" && body.model ? body.model : "gemini-2.5-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
        const upstream = await forward(
          url,
          { "Content-Type": "application/json", "x-goog-api-key": key },
          JSON.stringify(body.payload ?? {}),
        );
        res.status(upstream.status).type("application/json").send(upstream.text);
        return;
      }

      res.status(400).json({ error: "Unknown target. Expected 'bedrock' or 'gemini'." });
    } catch (err) {
      const timedOut = err instanceof DOMException && err.name === "AbortError";
      logger.error("Upstream forward failed", { target: body.target, timedOut, err });
      res.status(timedOut ? 504 : 502).json({ error: "Upstream request failed" });
    }
  },
);

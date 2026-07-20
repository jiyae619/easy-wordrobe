/**
 * StyleMax AI proxy — GOOGLE CLOUD CONSOLE (portal) deploy variant. ES MODULE.
 *
 * Paste this ENTIRE file into the console's index.js tab (replace the default helloHttp sample),
 * and paste the accompanying package.json into the package.json tab (it adds firebase-admin and
 * sets "type": "module" to match this `import` syntax).
 *
 * Console fields:  Function name: aiproxy  |  Entry point: aiproxy  |  Runtime: Node.js 22
 * (Entry point MUST equal the name in http("aiproxy", ...) below.)
 */
import { http } from "@google-cloud/functions-framework";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();

const AWS_REGION = process.env.AWS_REGION || "us-east-2";
const NOVA_MODEL_ID = process.env.NOVA_MODEL_ID || "us.amazon.nova-2-lite-v1:0";
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || "*";
const RATE_LIMIT_PER_MIN = Number.parseInt(process.env.RATE_LIMIT_PER_MIN || "30", 10) || 30;
// From Secret Manager references (console → Security → Reference a secret → expose as env var):
const BEDROCK_API_KEY = process.env.BEDROCK_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY; // optional

const UPSTREAM_TIMEOUT_MS = 30_000;
const RATE_WINDOW_MS = 60_000;

function resolveAllowedOrigin(origin) {
  const configured = ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  if (configured.includes("*")) return "*";
  if (origin && configured.includes(origin)) return origin;
  return configured[0] || "*";
}

async function isWithinRateLimit(uid) {
  const ref = getFirestore().collection("aiRateLimits").doc(uid);
  const now = Date.now();
  try {
    return await getFirestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.data();
      if (!data || now - (data.windowStart || 0) >= RATE_WINDOW_MS) {
        tx.set(ref, { windowStart: now, count: 1 });
        return true;
      }
      if ((data.count || 0) >= RATE_LIMIT_PER_MIN) return false;
      tx.update(ref, { count: FieldValue.increment(1) });
      return true;
    });
  } catch (err) {
    console.error("Rate-limit check failed; failing open", err);
    return true;
  }
}

async function forward(url, headers, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const r = await fetch(url, { method: "POST", headers, body, signal: controller.signal });
    return { status: r.status, text: await r.text() };
  } finally {
    clearTimeout(timer);
  }
}

http("aiproxy", async (req, res) => {
  res.set("Access-Control-Allow-Origin", resolveAllowedOrigin(req.headers.origin));
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.set("Access-Control-Max-Age", "3600");

  if (req.method === "OPTIONS") { res.status(204).send(""); return; }
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }

  const bearer = /^Bearer (.+)$/.exec(req.headers.authorization || "");
  if (!bearer) { res.status(401).json({ error: "Missing bearer token" }); return; }
  let uid;
  try {
    uid = (await getAuth().verifyIdToken(bearer[1])).uid;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  if (!(await isWithinRateLimit(uid))) {
    res.status(429).json({ error: "Rate limit exceeded. Please slow down and try again." });
    return;
  }

  const body = req.body || {};
  try {
    if (body.target === "bedrock") {
      if (!BEDROCK_API_KEY) { res.status(502).json({ error: "Bedrock not configured on server" }); return; }
      const url = `https://bedrock-runtime.${AWS_REGION}.amazonaws.com/model/${encodeURIComponent(NOVA_MODEL_ID)}/converse`;
      const up = await forward(
        url,
        { "Content-Type": "application/json", Authorization: `Bearer ${BEDROCK_API_KEY}` },
        JSON.stringify(body.payload || {}),
      );
      res.status(up.status).type("application/json").send(up.text);
      return;
    }

    if (body.target === "gemini") {
      if (!GEMINI_API_KEY) { res.status(502).json({ error: "Gemini is not configured on the server" }); return; }
      const model = typeof body.model === "string" && body.model ? body.model : "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const up = await forward(
        url,
        { "Content-Type": "application/json", "x-goog-api-key": GEMINI_API_KEY },
        JSON.stringify(body.payload || {}),
      );
      res.status(up.status).type("application/json").send(up.text);
      return;
    }

    res.status(400).json({ error: "Unknown target. Expected 'bedrock' or 'gemini'." });
  } catch (err) {
    const timedOut = err && err.name === "AbortError";
    console.error("Upstream forward failed", err);
    res.status(timedOut ? 504 : 502).json({ error: "Upstream request failed" });
  }
});

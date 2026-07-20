# StyleMax AI Proxy (Firebase Cloud Functions)

`aiProxy` is an authenticated forwarder that keeps the Bedrock / Gemini API keys **off the client**.
The browser sends a **Firebase ID token** (not an API key); the function verifies it, enforces a
per-user rate limit, and forwards the request to the upstream model with the real key held in
Secret Manager.

```
browser ──(Firebase ID token + Converse payload)──▶ aiProxy ──(server-side key)──▶ Bedrock / Gemini
```

## One-time setup

You need the Blaze plan (pay-as-you-go — expected cost is ~$0 at early scale) and the Firebase CLI.

```bash
# from the repo root
firebase login
firebase use --add            # select your Firebase project (the one in VITE_FIREBASE_PROJECT_ID)

cd functions && npm install && cd ..

# Store the Bedrock key as a secret (NOT in any VITE_ / .env client var):
firebase functions:secrets:set BEDROCK_API_KEY     # paste your Bedrock bearer key when prompted
```

Gemini is **optional** (the default provider is Nova). To enable the Gemini path in production:
1. `firebase functions:secrets:set GEMINI_API_KEY`
2. In `functions/src/index.ts`, add `defineSecret("GEMINI_API_KEY")` and include it in the
   `secrets: [...]` array, then redeploy. Until then the Gemini branch returns 502.

Optional non-secret config (defaults shown) can be set as function env vars in
`functions/.env` or via the console:

```
AWS_REGION=us-east-2
NOVA_MODEL_ID=us.amazon.nova-2-lite-v1:0
ALLOWED_ORIGINS=*          # tighten to your app origin(s), comma-separated, in production
RATE_LIMIT_PER_MIN=30      # max AI calls per user per rolling minute
```

## Deploy

```bash
firebase deploy --only functions
```

The deploy prints the function URL, e.g.
`https://aiproxy-abc123-uc.a.run.app` (or `https://us-central1-<project>.cloudfunctions.net/aiProxy`).

**Copy that URL into the frontend env** as `VITE_AI_PROXY_URL` (Amplify → Environment variables,
and your local `.env`), then rebuild the frontend. Without it, the app shows a clear
"AI service not configured" error instead of calling any model.

## Guardrails

- **Auth:** every call requires a valid Firebase ID token (`verifyIdToken`). No token → 401.
- **Rate limit:** `RATE_LIMIT_PER_MIN` calls per user per minute (Firestore-backed, durable across
  instances) → 429 when exceeded. Fails open on a rare Firestore outage (logged), since only
  signed-in users reach this path.
- **Budget alarm (recommended):** set a Google Cloud billing budget + alert so a runaway client
  can never surprise you. `maxInstances` is capped at 10 as a second backstop.

## Local development

```bash
cd functions && npm run serve      # emulates the function; point VITE_AI_PROXY_URL at the emulator URL
```

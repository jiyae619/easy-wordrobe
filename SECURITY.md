# Security

## Model API keys are server-side only

The Bedrock (and optional Gemini) API keys are **never shipped to the browser**. Any `VITE_*`
environment variable is inlined into the client bundle at build time, so a model key placed there
is world-readable — an earlier version of this app did exactly that. All model calls now route
through the **`aiProxy` Cloud Function** (`functions/`), which:

1. verifies the caller's **Firebase ID token** (no token → 401),
2. enforces a **per-user rate limit** (Firestore-backed) as an abuse/runaway guardrail,
3. forwards to Bedrock/Gemini using the real key held in **Secret Manager**.

The browser authenticates each call with the signed-in user's ID token, never an API key. See
`functions/README.md` for setup/deploy. Set a Google Cloud **billing budget alert** as a backstop.

## Other API keys & secrets

Non-secret client config (Firebase web SDK keys, etc.) lives in `VITE_*` env vars. Genuinely
secret credentials must live server-side (Functions secrets), never in source code or `VITE_*`.

### Setup

1. Copy `.env.example` to `.env`
2. Fill in your credentials in `.env`
3. Never commit `.env` (it is gitignored)

### If a Key Was Exposed

If a Firebase API key or other secret was committed to git history:

1. **Rotate the key immediately** in the Firebase Console (Project Settings → General → Web API Key) or the relevant service
2. Update your local `.env` with the new key
3. Consider using [git-filter-repo](https://github.com/newren/git-filter-repo) or [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) to remove the key from git history (requires force-push; coordinate with collaborators)

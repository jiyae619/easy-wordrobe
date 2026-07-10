# Deploy the AI proxy from the web portal (no terminal)

The **Firebase Console** cannot deploy function *code* — but the **Google Cloud Console**
(`console.cloud.google.com`, same project) can, via the Cloud Run functions inline editor.
Paste the two files in this folder (`index.js`, `package.json`) and click Deploy.

Steps (full details in the chat walkthrough):

1. **Blaze** — Firebase Console → upgrade to the Blaze plan (needed for functions).
2. **Secret** — Cloud Console → Secret Manager → create secret `BEDROCK_API_KEY` = your Bedrock key.
3. **Create function** — Cloud Console → Cloud Run functions → Create function (2nd gen):
   - **Function name** `aiproxy` (lowercase, no capitals/hyphens), HTTPS trigger,
     **Allow unauthenticated** (auth is done in-code via the Firebase token — this is the standard
     pattern; the function still rejects tokenless calls).
   - Runtime **Node.js 22** (Node 20 is deprecated), memory 256 MiB, timeout 60s, max instances 10.
   - Env vars (optional; defaults exist): `AWS_REGION`, `NOVA_MODEL_ID`, `ALLOWED_ORIGINS`, `RATE_LIMIT_PER_MIN`.
   - Security → Reference a secret → `BEDROCK_API_KEY`, expose as env var `BEDROCK_API_KEY`.
   - **Entry point** `aiproxy` — MUST exactly equal the name in `functions.http("aiproxy")` in the
     code (a mismatch causes "container failed to start on port 8080"). Paste `index.js` +
     `package.json` (both tabs!); Deploy. The URL will end in `/aiproxy`.
   - If deploy fails with *"Permission denied on secret … secretmanager.secretAccessor"*: the
     function's runtime service account needs read access to the secret. Cloud Console → Secret
     Manager → click `BEDROCK_API_KEY` → **Permissions** → **Grant access** → principal = the
     runtime service account shown in the error (e.g. `firebase-adminsdk-…@<project>.iam.gserviceaccount.com`)
     → role **Secret Manager Secret Accessor** → Save, then redeploy. (The `firebase deploy` CLI
     does this grant automatically; the console does not.)
4. **URL → frontend** — copy the function URL into AWS Amplify env var `VITE_AI_PROXY_URL`, redeploy the frontend.
5. **Budget alert** — Cloud Console → Billing → Budgets & alerts → create a small budget.

This variant is plain JS (not the Firebase-SDK TypeScript in `../src`) precisely so it pastes
cleanly into the console editor with no build step.

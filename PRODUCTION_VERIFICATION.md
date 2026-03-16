# Production Verification Guide

This document supports the root-cause analysis plan tasks:

1. **verify-prod-runtime-errors**: Reproduce each symptom and collect exact network/console failure signatures
2. **confirm-firebase-prod-config**: Validate deployed Firestore rules, Storage rules, CORS, and project/bucket mapping

---

## 1. Reproduce Production Symptoms & Collect Failure Signatures

### Instrumentation

The app includes production diagnostics that capture structured events at each critical step:

- **Auth**: `auth_state` when user signs in/out
- **Post-login load**: `load_user_data_start`, `load_user_data_migration`, `load_user_data_firestore`, `load_user_data_stale_demo`, `load_user_data_end`, `load_user_data_error`
- **Add to Wardrobe**: `storage_upload_start/end/error`, `firestore_write_start/end/error`
- **Camera**: `camera_start`, `camera_origin_check`, `camera_error`
- **Scanner**: `scanner_analyze_start/end/error`, `scanner_save_start/end/error`

Events are stored in `window.__WARDROBE_DIAG__` and available to the smoke test script.

### Smoke Test Script

1. Open your **production URL** (e.g. `https://main.xxxxx.amplifyapp.com`)
2. Open DevTools → **Console**
3. Paste the contents of `scripts/production-smoke-test.js` and press Enter
4. Follow the flow:
   - **Login** → Sign in with Google or email
   - **Wardrobe load** → Wait for home/wardrobe to load (or note infinite spinner)
   - **Populate Demo** → If shown, click "Populate Demo Data"
   - **Add to Wardrobe** → Open scanner, capture/upload photo, tap "Add to Wardrobe"
   - **Insights** → Navigate to Insights and trigger AI insights
5. After each step (or when you see a failure), run: `smokeTest.capture("step_name")`
6. When done, run: `smokeTest.report()` and copy the JSON output

### Expected Failure Signatures (by symptom)

| Symptom | Step to capture | Typical error codes / messages |
|---------|-----------------|--------------------------------|
| Post-login infinite loading | `smokeTest.capture("post_login")` after 30+ seconds | `load_user_data_error` with `permission-denied`, `Firestore fetch (timed out)`, or `Stale demo migration (timed out)` |
| Populate Demo fails | After clicking Populate Demo | `firestore_write_error` with `permission-denied` or `insufficient` |
| Add to Wardrobe fails | After tapping Add to Wardrobe | `storage_upload_error` with `storage/unauthorized`, `storage/cors-not-allowed`, or `storage/object-not-found`; or `firestore_write_error` with `permission-denied` |
| Camera blocked | When opening scanner | `camera_origin_check` with `allowed: false` (HTTP non-localhost), or `camera_error` with `NotAllowedError` |

### Enable verbose console logging

Set `VITE_DEBUG_PROD=true` in Amplify environment variables and redeploy to get `[WardrobeDiag]` logs in the production console.

---

## 2. Validate Firebase Production Config

### Runtime Verification Script

1. Open production URL and **sign in**
2. Open DevTools → **Console**
3. Paste the contents of `scripts/verify-firebase-prod.js` and press Enter
4. Review the output:
   - **configPresent**: Confirms project ID and storage bucket are set
   - **firestore**: Result of a minimal Firestore read (settings doc). `ok: true` = rules allow read
   - **storage**: Result of a minimal Storage upload + delete. `ok: true` = rules and CORS allow upload

### Manual Firebase Console Checks

See `scripts/FIREBASE_CONFIG_CHECKLIST.md` for a complete validation checklist.

| Check | Where | Expected |
|-------|-------|----------|
| **Project ID** | Firebase Console → Project settings | Must match `VITE_FIREBASE_PROJECT_ID` in Amplify env vars |
| **Storage bucket** | Firebase Console → Storage | Must match `VITE_FIREBASE_STORAGE_BUCKET` (e.g. `your-project.appspot.com` or `your-project.firebasestorage.app`) |
| **Authorized domains** | Auth → Settings → Authorized domains | Production domain (e.g. `main.xxxxx.amplifyapp.com`) must be listed |
| **Firestore rules** | Firestore → Rules | Must allow `users/{userId}/{document=**}` for `request.auth.uid == userId` |
| **Storage rules** | Storage → Rules | Must allow `wardrobe/{userId}/{allPaths=**}` for `request.auth.uid == userId` |
| **Storage CORS** | Google Cloud Console → Storage → Bucket → CORS | Must include production origin; `storage-cors.json` in repo has `origin: ["*"]` for development |

### Repo Reference Files

- `firestore.rules` — Expected Firestore rules
- `storage.rules` — Expected Storage rules
- `storage-cors.json` — CORS config to apply via `gcloud storage buckets update gs://BUCKET --cors-file=storage-cors.json`

### Deploy Rules (if not auto-deployed)

Amplify does not deploy Firebase rules. Deploy manually:

```bash
firebase deploy --only firestore:rules
firebase deploy --only storage
```

Or copy rules from the repo into Firebase Console and publish.

### CORS Application

If Storage uploads fail with CORS errors in production:

```bash
gcloud storage buckets update gs://YOUR_BUCKET_NAME --cors-file=storage-cors.json
```

See `PRODUCTION_FIREBASE_SETUP.md` for full CORS setup instructions.

# Firebase Production Config Validation Checklist

Use this checklist to validate deployed Firestore rules, Storage rules, CORS, and project/bucket mapping.

## 1. Runtime Verification (Automated)

**Run on production site while signed in:**

1. Open production URL and sign in
2. DevTools → Console
3. Paste and run `scripts/verify-firebase-prod.js`
4. Verify output:
   - `configPresent.ok` = true (project ID and bucket set)
   - `firestore.ok` = true (rules allow read)
   - `storage.ok` = true (rules + CORS allow upload)

**Common failure codes:**

| Code | Meaning | Fix |
|------|---------|-----|
| `permission-denied` | Firestore/Storage rules block the operation | Deploy rules from repo; ensure `request.auth.uid == userId` |
| `storage/cors-not-allowed` | Bucket CORS blocks production origin | Apply `storage-cors.json` via gcloud |
| `storage/unauthorized` | Storage rules block upload | Deploy `storage.rules` |
| `storage/object-not-found` | Path or bucket mismatch | Verify `VITE_FIREBASE_STORAGE_BUCKET` matches Firebase Console |

## 2. Project & Bucket Mapping

| Source | Where to check | Must match |
|--------|----------------|------------|
| Project ID | Amplify env: `VITE_FIREBASE_PROJECT_ID` | Firebase Console → Project settings |
| Storage bucket | Amplify env: `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Console → Storage (e.g. `project.appspot.com` or `project.firebasestorage.app`) |
| Auth domain | Amplify env: `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Console → Auth (e.g. `project.firebaseapp.com`) |

## 3. Firestore Rules (Manual)

**Firebase Console → Firestore → Rules**

Expected (from `firestore.rules`):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

- [ ] Rules match repo
- [ ] Published (not just saved)

## 4. Storage Rules (Manual)

**Firebase Console → Storage → Rules**

Expected (from `storage.rules`):

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /wardrobe/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

- [ ] Rules match repo
- [ ] Published

## 5. Storage CORS (Manual)

**Google Cloud Console → Cloud Storage → Buckets → [your bucket] → CORS**

Expected (from `storage-cors.json`):

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "PUT", "POST", "OPTIONS"],
    "responseHeader": ["Content-Type", "Content-Length", "x-goog-resumable", "x-goog-meta-*", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
```

To apply via CLI:

```bash
gcloud storage buckets update gs://YOUR_BUCKET_NAME --cors-file=storage-cors.json
```

- [ ] CORS includes production origin (or `*`)
- [ ] Methods include PUT, POST, OPTIONS

## 6. Authorized Domains (Auth)

**Firebase Console → Authentication → Settings → Authorized domains**

- [ ] Production domain listed (e.g. `main.xxxxx.amplifyapp.com`)

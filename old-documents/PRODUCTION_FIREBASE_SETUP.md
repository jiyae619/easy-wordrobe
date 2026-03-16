# Firebase Production Setup

If the app works in dev but fails in production (Populate Demo Data, Add to Wardrobe, camera), configure Firebase for your production domain.

## 1. Authorized Domains (Auth)

Firebase Auth requires your production domain in the allowlist.

1. Open [Firebase Console](https://console.firebase.google.com) → your project
2. **Authentication** → **Settings** → **Authorized domains**
3. Add your production domain (e.g. `main.xxxxx.amplifyapp.com` or your custom domain)

Auth already works for you, so this is likely done. If not, add the domain.

---

## 2. Firestore Security Rules

Firestore must allow authenticated users to read/write their own data.

1. **Firestore** → **Rules**
2. Replace with (or merge) the rules from `firestore.rules` in this repo:

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

3. **Publish**

---

## 3. Storage Security Rules

Storage must allow authenticated users to upload to their own folder.

1. **Storage** → **Rules**
2. Replace with (or merge) the rules from `storage.rules`:

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

3. **Publish**

---

## 4. Storage CORS (Critical for Uploads)

Firebase Storage uses Google Cloud Storage. By default, CORS may block uploads from your production domain.

1. Get your bucket name from Firebase Console → **Storage** (e.g. `your-project.appspot.com` or `your-project.firebasestorage.app`)

2. Create `storage-cors.json` (or use the one in this repo):

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

3. Apply CORS (requires [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)):

```bash
# Using gcloud (recommended)
gcloud storage buckets update gs://YOUR_BUCKET_NAME --cors-file=storage-cors.json

# Or using gsutil
gsutil cors set storage-cors.json gs://YOUR_BUCKET_NAME
```

4. Or use **Google Cloud Shell** (no local install):
   - Open [Cloud Console](https://console.cloud.google.com) → select your project
   - Click the Cloud Shell icon (>_) 
   - Upload `storage-cors.json` or paste its contents into a new file
   - Run: `gcloud storage buckets update gs://YOUR_BUCKET_NAME --cors-file=storage-cors.json`

---

## 5. Environment Variables (Amplify)

Ensure all `VITE_*` vars are set in **Amplify Console** → **App settings** → **Environment variables**:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_AWS_REGION`
- `VITE_BEDROCK_API_KEY`

Redeploy after changing env vars.

---

## Quick Checklist

| Step | Where | Status |
|------|-------|--------|
| Authorized domains | Firebase Console → Auth → Settings | Add production URL |
| Firestore rules | Firestore → Rules | Allow `users/{userId}/**` for auth users |
| Storage rules | Storage → Rules | Allow `wardrobe/{userId}/**` for auth users |
| Storage CORS | gcloud/gsutil | Apply `storage-cors.json` to bucket |
| Env vars | Amplify → Environment variables | All VITE_* set |

---

## Deploy Rules via Firebase CLI (Optional)

If you use Firebase CLI:

```bash
firebase init  # if not already
firebase deploy --only firestore:rules
firebase deploy --only storage
```

Ensure `firestore.rules` and `storage.rules` exist in your project (or add them to `firebase.json`).

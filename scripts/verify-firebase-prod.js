/**
 * Firebase Production Config Verification Script
 *
 * Paste this into the browser console on your production site to validate:
 * - Firebase project ID and storage bucket mapping
 * - Firestore rules (via a minimal read attempt)
 * - Storage rules + CORS (via a minimal upload attempt)
 *
 * Prerequisites: Be signed in. The script uses the current user's auth.
 *
 * Usage:
 * 1. Open production URL and sign in
 * 2. Open DevTools → Console
 * 3. Paste this script and press Enter
 * 4. Review the verification results
 */

(async function () {
  const config = window.__WARDROBE_FIREBASE_CONFIG__;
  if (!config) {
    console.error(
      '[VerifyFirebase] __WARDROBE_FIREBASE_CONFIG__ not found. Ensure the app has loaded.'
    );
    return;
  }

  const results = {
    timestamp: new Date().toISOString(),
    origin: location.origin,
    config: { ...config },
    checks: {},
  };

  console.log('=== Firebase Production Verification ===');
  console.log('Project ID:', config.projectId);
  console.log('Storage Bucket:', config.storageBucket);
  console.log('Auth Domain:', config.authDomain);
  console.log('Origin:', location.origin);

  // Check 1: Firebase config present
  results.checks.configPresent = {
    ok: !!(config.projectId && config.storageBucket),
    projectId: config.projectId,
    storageBucket: config.storageBucket,
  };

  // Check 2: Firestore - we need to use the app's Firestore. The script runs in the page context,
  // so we can try to access the firestore module. Actually we can't easily import - the script
  // is pasted in console. We need another approach.
  //
  // Alternative: Add a window.__WARDROBE_VERIFY_FIRESTORE__ = async (uid) => { ... } that
  // the app exposes, which does a minimal getDoc. Or we could make a fetch to Firestore REST API.
  //
  // Simpler: Document the manual verification steps and provide a script that at least
  // validates the config and provides the expected values for comparison.
  //
  // Let's add a verification endpoint in the app that we can call - no, that's overkill.
  //
  // Best approach: Export a verify function from the app that uses the existing Firebase
  // instances. We can add to firebaseConfig or a new verify module:
  // window.__WARDROBE_VERIFY__ = async () => { ... }
  //
  // I'll add that to the app, then this script can call it.
  const verify = window.__WARDROBE_VERIFY__;
  if (verify && typeof verify === 'function') {
    try {
      const verifyResult = await verify();
      results.checks.firestore = verifyResult.firestore;
      results.checks.storage = verifyResult.storage;
    } catch (e) {
      results.checks.verifyError = { message: String(e) };
    }
  } else {
    results.checks.firestore = {
      ok: null,
      message: 'Run verification from app context. Ensure __WARDROBE_VERIFY__ is available.',
    };
    results.checks.storage = { ok: null, message: 'Same as above.' };
  }

  // Expected values from repo (for manual comparison)
  results.expectedFromRepo = {
    firestoreRules:
      'match /users/{userId}/{document=**} { allow read, write: if request.auth != null && request.auth.uid == userId; }',
    storageRules:
      'match /wardrobe/{userId}/{allPaths=**} { allow read, write: if request.auth != null && request.auth.uid == userId; }',
    storageCors:
      'origin: ["*"], method: ["GET","PUT","POST","OPTIONS"], responseHeader: ["Content-Type","Content-Length","x-goog-resumable","x-goog-meta-*","Authorization"]',
  };

  console.log('=== Verification Results ===');
  console.log(JSON.stringify(results, null, 2));
  return results;
})();

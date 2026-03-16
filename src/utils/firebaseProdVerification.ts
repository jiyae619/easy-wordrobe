/**
 * Firebase production verification - exposes __WARDROBE_VERIFY__ for the
 * verify-firebase-prod.js console script to test Firestore and Storage rules.
 */

import { getDoc, doc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '../services/firebaseConfig';

export async function runFirebaseVerification(): Promise<{
  firestore: { ok: boolean; code?: string; message?: string };
  storage: { ok: boolean; code?: string; message?: string };
}> {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    return {
      firestore: { ok: false, message: 'Not signed in' },
      storage: { ok: false, message: 'Not signed in' },
    };
  }

  const firestoreResult = await verifyFirestore(uid);
  const storageResult = await verifyStorage(uid);
  return { firestore: firestoreResult, storage: storageResult };
}

async function verifyFirestore(uid: string): Promise<{ ok: boolean; code?: string; message?: string }> {
  try {
    const settingsRef = doc(db, 'users', uid, 'settings', 'preferences');
    await getDoc(settingsRef);
    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      code: err?.code,
      message: err?.message || String(err),
    };
  }
}

async function verifyStorage(uid: string): Promise<{ ok: boolean; code?: string; message?: string }> {
  const testId = `verify-${Date.now()}`;
  const testRef = ref(storage, `wardrobe/${uid}/${testId}.txt`);
  try {
    await uploadString(testRef, 'verification', 'raw');
    await getDownloadURL(testRef); // verify read works
    await deleteObject(testRef);
    return { ok: true };
  } catch (err: any) {
    return {
      ok: false,
      code: err?.code,
      message: err?.message || String(err),
    };
  }
}

if (typeof window !== 'undefined') {
  (window as any).__WARDROBE_VERIFY__ = runFirebaseVerification;
}

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { REQUIRED_FIREBASE_ENV_VARS } from './firebaseEnvCheck';

function getFirebaseConfig() {
    const missing = REQUIRED_FIREBASE_ENV_VARS.filter((key) => !import.meta.env[key]);
    if (missing.length > 0) {
        throw new Error(
            `Missing required Firebase env vars: ${missing.join(', ')}. ` +
                'Copy .env.example to .env and add your Firebase credentials. Never commit .env.'
        );
    }
    return {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
}

const firebaseConfig = getFirebaseConfig();

/** Expose for production verification script (window.__WARDROBE_FIREBASE_CONFIG__) */
if (typeof window !== 'undefined') {
    (window as any).__WARDROBE_FIREBASE_CONFIG__ = {
        projectId: firebaseConfig.projectId,
        storageBucket: firebaseConfig.storageBucket,
        authDomain: firebaseConfig.authDomain,
    };
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

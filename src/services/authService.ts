import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged,
    type User
} from 'firebase/auth';
import { auth } from './firebaseConfig';

const googleProvider = new GoogleAuthProvider();

export const authService = {
    /**
     * Sign up with email + password, then set display name.
     */
    async signUpWithEmail(email: string, password: string, displayName: string): Promise<User> {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName });
        return credential.user;
    },

    /**
     * Sign in with email + password.
     */
    async signInWithEmail(email: string, password: string): Promise<User> {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        return credential.user;
    },

    /**
     * Sign in with Google OAuth popup.
     */
    async signInWithGoogle(): Promise<User> {
        const credential = await signInWithPopup(auth, googleProvider);
        return credential.user;
    },

    /**
     * Sign out the current user.
     */
    async signOut(): Promise<void> {
        await signOut(auth);
    },

    /**
     * Send a password reset email.
     */
    async resetPassword(email: string): Promise<void> {
        await sendPasswordResetEmail(auth, email);
    },

    /**
     * Listen for auth state changes.
     */
    onAuthStateChanged(callback: (user: User | null) => void) {
        return onAuthStateChanged(auth, callback);
    }
};

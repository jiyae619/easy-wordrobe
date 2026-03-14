import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '../services/authService';
import type { AuthUser, AuthContextType } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Translates Firebase error codes to user-friendly messages.
 */
function getAuthErrorMessage(code: string): string {
    switch (code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Try signing in instead.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/weak-password':
            return 'Password must be at least 6 characters.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            return 'Invalid email or password.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please try again later.';
        case 'auth/popup-closed-by-user':
            return 'Google sign-in was cancelled.';
        case 'auth/network-request-failed':
            return 'Network error. Check your connection.';
        default:
            return 'Something went wrong. Please try again.';
    }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Listen for auth state changes (session persistence)
    useEffect(() => {
        const unsubscribe = authService.onAuthStateChanged((firebaseUser) => {
            if (firebaseUser) {
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                });
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signInWithEmail = async (email: string, password: string) => {
        setError(null);
        setIsLoading(true);
        try {
            await authService.signInWithEmail(email, password);
        } catch (err: any) {
            setError(getAuthErrorMessage(err.code));
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const signUpWithEmail = async (email: string, password: string, displayName: string) => {
        setError(null);
        setIsLoading(true);
        try {
            await authService.signUpWithEmail(email, password, displayName);
        } catch (err: any) {
            setError(getAuthErrorMessage(err.code));
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const signInWithGoogle = async () => {
        setError(null);
        setIsLoading(true);
        try {
            await authService.signInWithGoogle();
        } catch (err: any) {
            setError(getAuthErrorMessage(err.code));
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setError(null);
        try {
            await authService.signOut();
        } catch (err: any) {
            setError(getAuthErrorMessage(err.code));
        }
    };

    const resetPassword = async (email: string) => {
        setError(null);
        try {
            await authService.resetPassword(email);
        } catch (err: any) {
            setError(getAuthErrorMessage(err.code));
            throw err;
        }
    };

    const clearError = () => setError(null);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                error,
                signInWithEmail,
                signUpWithEmail,
                signInWithGoogle,
                logout,
                resetPassword,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

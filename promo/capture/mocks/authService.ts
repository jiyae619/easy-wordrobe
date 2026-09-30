import { DEMO_USER } from './demoUser';
let listeners: Array<(u: any) => void> = [];
export const authService = {
    async signUpWithEmail() { return DEMO_USER as any; },
    async signInWithEmail() { return DEMO_USER as any; },
    async signInWithGoogle() { return { user: DEMO_USER as any, isNewUser: false }; },
    async signOut() { /* demo: stay signed in */ },
    async resetPassword() { },
    onAuthStateChanged(callback: (user: any) => void) {
        listeners.push(callback);
        setTimeout(() => callback(DEMO_USER), 0);
        return () => { listeners = listeners.filter((l) => l !== callback); };
    },
};

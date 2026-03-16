# Critical Fix: User Database Isolation

## Root Cause

When a **new user signs up**, the app runs `migrateFromLocalStorage(uid)` which copies data from `localStorage` keys `wardrobe_clothes` and `wardrobe_outfits` into Firestore. These keys are **shared across all users** on the same browser. On a shared device or when User A logs out and User B signs up, User B receives User A's wardrobe data.

## Fix (apply in main project: `dev/wardrobe-ai`)

### 1. `src/services/authService.ts`

Change `signInWithGoogle` to return `{ user, isNewUser }`:

```typescript
async signInWithGoogle(): Promise<{ user: User; isNewUser: boolean }> {
    const credential = await signInWithPopup(auth, googleProvider);
    const isNewUser = credential.additionalUserInfo?.isNewUser ?? false;
    return { user: credential.user, isNewUser };
},
```

### 2. `src/context/AuthContext.tsx`

**signUpWithEmail** – set skip-migration flag after successful sign-up:

```typescript
const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    setError(null);
    setIsLoading(true);
    try {
        const user = await authService.signUpWithEmail(email, password, displayName);
        sessionStorage.setItem('wardrobe_skip_migration', user.uid);
    } catch (err: any) {
        setError(getAuthErrorMessage(err.code));
        throw err;
    } finally {
        setIsLoading(false);
    }
};
```

**signInWithGoogle** – set flag only for new users:

```typescript
const signInWithGoogle = async () => {
    setError(null);
    setIsLoading(true);
    try {
        const { user, isNewUser } = await authService.signInWithGoogle();
        if (isNewUser) {
            sessionStorage.setItem('wardrobe_skip_migration', user.uid);
        }
    } catch (err: any) {
        setError(getAuthErrorMessage(err.code));
        throw err;
    } finally {
        setIsLoading(false);
    }
};
```

### 3. `src/context/WardrobeContext.tsx`

In `loadUserData`, skip migration when the user just signed up:

```typescript
const loadUserData = async () => {
    setIsLoading(true);
    setError(null);
    try {
        const skipMigration = sessionStorage.getItem('wardrobe_skip_migration') === uid;
        if (skipMigration) {
            sessionStorage.removeItem('wardrobe_skip_migration');
        }
        if (!skipMigration) {
            await firestoreService.migrateFromLocalStorage(uid);
        }

        const [items, outfitRecords, settings] = await Promise.all([
            firestoreService.getWardrobe(uid),
            firestoreService.getOutfits(uid),
            firestoreService.getUserSettings(uid),
        ]);
        // ... rest unchanged
```

## Summary

- **New sign-ups** (email or Google) set `wardrobe_skip_migration` in sessionStorage.
- **WardrobeContext** checks this flag before migrating; if set, it skips migration and clears the flag.
- Existing users signing in are unaffected; migration still runs for them when appropriate.

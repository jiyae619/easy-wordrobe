# Database Isolation Fix – Apply to Main Project

This fix prevents new users from seeing other users' wardrobe data when signing up.

## Root cause

`migrateFromLocalStorage` copies data from shared `localStorage` keys (`wardrobe_clothes`, `wardrobe_outfits`) into Firestore. On a shared device, a new user can receive the previous user's data.

## How to apply

Copy these files into your main project at `/Users/jiyaechoi/dev/wardrobe-ai`:

```bash
# From the project root (where pyo worktree lives)
cp fix/authService.ts /Users/jiyaechoi/dev/wardrobe-ai/src/services/authService.ts
cp fix/AuthContext.tsx /Users/jiyaechoi/dev/wardrobe-ai/src/context/AuthContext.tsx
```

Then apply the WardrobeContext change manually (see below).

## WardrobeContext change

In `src/context/WardrobeContext.tsx`, replace the block:

```javascript
                // Attempt migration from localStorage (no-op if Firestore already has data)
                await firestoreService.migrateFromLocalStorage(uid);

                // Load all data from Firestore
```

with:

```javascript
                // Skip migration for new sign-ups to prevent cross-user data leak (localStorage is shared)
                const skipMigration = sessionStorage.getItem('wardrobe_skip_migration') === uid;
                if (skipMigration) {
                    sessionStorage.removeItem('wardrobe_skip_migration');
                }
                if (!skipMigration) {
                    await firestoreService.migrateFromLocalStorage(uid);
                }

                // Load all data from Firestore
```

## Summary of changes

1. **authService.ts**: `signInWithGoogle` returns `{ user, isNewUser }` using `getAdditionalUserInfo()` to detect new Google sign-ups.
2. **AuthContext.tsx**: After sign-up (email or Google), sets `wardrobe_skip_migration` in sessionStorage.
3. **WardrobeContext.tsx**: Skips migration when the flag is set for the current user.

import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    writeBatch,
} from 'firebase/firestore';
import { db } from './firebaseConfig';
import type { ClothingItem, WearRecord, ColorCorrection } from '../types';

// ==========================================
// Helper: Serialize/deserialize dates
// ==========================================

function serializeItem(item: ClothingItem): Record<string, any> {
    return {
        ...item,
        lastWorn: item.lastWorn ? item.lastWorn.toISOString() : null,
        dateAdded: item.dateAdded.toISOString(),
    };
}

function deserializeItem(data: Record<string, any>): ClothingItem {
    return {
        ...data,
        lastWorn: data.lastWorn ? new Date(data.lastWorn) : null,
        dateAdded: new Date(data.dateAdded),
    } as ClothingItem;
}

function serializeOutfit(record: WearRecord): Record<string, any> {
    return {
        ...record,
        date: record.date.toISOString(),
    };
}

function deserializeOutfit(data: Record<string, any>): WearRecord {
    return {
        ...data,
        date: new Date(data.date),
    } as WearRecord;
}

// ==========================================
// User Settings type
// ==========================================

export interface UserSettings {
    bookmarkedItems: string[];
    /** Item IDs the user tapped "Try it" on from the Insights page */
    tryItItemIds?: string[];
    gender?: string;
    height?: string;
    weight?: string;
    preferredVibe?: string;
}

const DEFAULT_SETTINGS: UserSettings = {
    bookmarkedItems: [],
    tryItItemIds: [],
};

// ==========================================
// Firestore Service
// ==========================================

export const firestoreService = {
    // ------ Wardrobe (ClothingItem) ------

    async getWardrobe(uid: string): Promise<ClothingItem[]> {
        const snapshot = await getDocs(collection(db, 'users', uid, 'wardrobe'));
        return snapshot.docs.map((doc) => deserializeItem(doc.data()));
    },

    async addClothingItem(uid: string, item: ClothingItem): Promise<void> {
        const docRef = doc(db, 'users', uid, 'wardrobe', item.id);
        await setDoc(docRef, serializeItem(item));
    },

    async updateClothingItem(uid: string, itemId: string, updates: Partial<ClothingItem>): Promise<void> {
        const docRef = doc(db, 'users', uid, 'wardrobe', itemId);
        // Serialize date fields if present
        const serialized: Record<string, any> = { ...updates };
        if (updates.lastWorn !== undefined) {
            serialized.lastWorn = updates.lastWorn ? updates.lastWorn.toISOString() : null;
        }
        if (updates.dateAdded !== undefined) {
            serialized.dateAdded = updates.dateAdded.toISOString();
        }
        await updateDoc(docRef, serialized);
    },

    async deleteClothingItem(uid: string, itemId: string): Promise<void> {
        const docRef = doc(db, 'users', uid, 'wardrobe', itemId);
        await deleteDoc(docRef);
    },

    // ------ Color corrections (eval / fine-tune dataset) ------

    /** Append one {AI → user} color correction. Per-user collection (multi-tenant isolation). */
    async logColorCorrection(uid: string, correction: ColorCorrection): Promise<void> {
        const docRef = doc(db, 'users', uid, 'colorCorrections', correction.id);
        await setDoc(docRef, { ...correction, createdAt: correction.createdAt.toISOString() });
    },

    async deleteAllDemoItems(uid: string): Promise<void> {
        const snapshot = await getDocs(collection(db, 'users', uid, 'wardrobe'));
        const batch = writeBatch(db);
        snapshot.docs
            .filter(d => d.id.startsWith('demo-'))
            .forEach(d => batch.delete(d.ref));
        await batch.commit();
    },

    // ------ Outfits (WearRecord) ------

    async getOutfits(uid: string): Promise<WearRecord[]> {
        const snapshot = await getDocs(collection(db, 'users', uid, 'outfits'));
        return snapshot.docs.map((doc) => deserializeOutfit(doc.data()));
    },

    async addOutfit(uid: string, record: WearRecord): Promise<void> {
        const docRef = doc(db, 'users', uid, 'outfits', record.id);
        await setDoc(docRef, serializeOutfit(record));
    },

    async deleteAllOutfits(uid: string): Promise<void> {
        const snapshot = await getDocs(collection(db, 'users', uid, 'outfits'));
        const batch = writeBatch(db);
        snapshot.docs.forEach(d => batch.delete(d.ref));
        if (!snapshot.empty) await batch.commit();
    },

    // ------ User Settings ------

    async getUserSettings(uid: string): Promise<UserSettings> {
        const docRef = doc(db, 'users', uid, 'settings', 'preferences');
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data() as UserSettings;
        }
        return DEFAULT_SETTINGS;
    },

    async updateUserSettings(uid: string, updates: Partial<UserSettings>): Promise<void> {
        const docRef = doc(db, 'users', uid, 'settings', 'preferences');
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            await updateDoc(docRef, updates);
        } else {
            await setDoc(docRef, { ...DEFAULT_SETTINGS, ...updates });
        }
    },

    async addTryItItem(uid: string, itemId: string): Promise<string[]> {
        const settings = await this.getUserSettings(uid);
        const current = settings.tryItItemIds ?? [];
        if (current.includes(itemId)) return current;
        const updated = [...current, itemId];
        await this.updateUserSettings(uid, { tryItItemIds: updated });
        return updated;
    },

    async removeTryItItem(uid: string, itemId: string): Promise<string[]> {
        const settings = await this.getUserSettings(uid);
        const updated = (settings.tryItItemIds ?? []).filter(id => id !== itemId);
        await this.updateUserSettings(uid, { tryItItemIds: updated });
        return updated;
    },

    // ------ Migration: localStorage → Firestore ------

    async migrateFromLocalStorage(uid: string): Promise<{ migratedItems: number; migratedOutfits: number }> {
        let migratedItems = 0;
        let migratedOutfits = 0;

        // Check if user already has data in Firestore
        const existingItems = await getDocs(collection(db, 'users', uid, 'wardrobe'));
        if (!existingItems.empty) {
            // User already has cloud data — skip migration
            return { migratedItems: 0, migratedOutfits: 0 };
        }

        // Migrate wardrobe items
        const clothesRaw = localStorage.getItem('wardrobe_clothes');
        if (clothesRaw) {
            try {
                const items: any[] = JSON.parse(clothesRaw);
                const batch = writeBatch(db);
                for (const item of items) {
                    const docRef = doc(db, 'users', uid, 'wardrobe', item.id);
                    batch.set(docRef, {
                        ...item,
                        lastWorn: item.lastWorn || null,
                        dateAdded: item.dateAdded || new Date().toISOString(),
                    });
                    migratedItems++;
                }
                await batch.commit();
            } catch (e) {
                console.error('[Migration] Failed to migrate wardrobe items:', e);
            }
        }

        // Migrate outfits
        const outfitsRaw = localStorage.getItem('wardrobe_outfits');
        if (outfitsRaw) {
            try {
                const outfits: any[] = JSON.parse(outfitsRaw);
                const batch = writeBatch(db);
                for (const outfit of outfits) {
                    const docRef = doc(db, 'users', uid, 'outfits', outfit.id);
                    batch.set(docRef, outfit);
                    migratedOutfits++;
                }
                await batch.commit();
            } catch (e) {
                console.error('[Migration] Failed to migrate outfits:', e);
            }
        }

        // Migrate bookmarks
        const bookmarksRaw = localStorage.getItem('wardrobe_bookmarks');
        if (bookmarksRaw) {
            try {
                const bookmarks: string[] = JSON.parse(bookmarksRaw);
                if (bookmarks.length > 0) {
                    await this.updateUserSettings(uid, { bookmarkedItems: bookmarks });
                }
            } catch (e) {
                console.error('[Migration] Failed to migrate bookmarks:', e);
            }
        }

        console.log(`[Migration] Migrated ${migratedItems} items, ${migratedOutfits} outfits to Firestore`);
        return { migratedItems, migratedOutfits };
    },
};

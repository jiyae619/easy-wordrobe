import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
    type ClothingItem,
    type ColorCorrection,
    type FashionMood,
    type WeatherData,
    type WearRecord,
    type WardrobeContextType,
    type UserInsight,
    type SuggestionEvent,
} from '../types';
import { type UserSettings } from '../services/firestoreService';
import { weatherService } from '../services/weatherService';
import { firestoreService } from '../services/firestoreService';
import { storageService } from '../services/storageService';
import { useAuth } from './AuthContext';
import { DEMO_ITEMS } from '../data/demoItems';

import { awsNovaService } from "../services/awsNova";
import { prodDiag } from '../utils/productionDiagnostics';
import { compressImage, cropImageToBoundingBox, toDataUrl } from '../utils/imageUtils';
import type { ItemBoundingBox } from '../types';
import { computeBehavioralAnalytics, computeSeasonalLeastWornIds, getCurrentSeason, moodIdsForStyling } from '../services/agents/agentOutputGuards';
import { drainAgentMetricTally } from '../services/agents/agentTelemetry';
import { getActiveProvider } from '../services/vision/providerRegistry';

const WardrobeContext = createContext<WardrobeContextType | undefined>(undefined);

const FIRESTORE_TIMEOUT_MS = 30000;
const THUMBNAIL_VERSION = 2;
const RECENT_OUTFITS_DAYS = 90;                    // wear history loaded into memory on login
const SUGGESTION_EVENTS_DAYS = 60;                 // rejection-signal window loaded on login
const RECENT_WEAR_DAYS = 21;                        // window BehavioralAgent analyzes for insights
const INSIGHTS_MAX_AGE_MS = 24 * 60 * 60 * 1000;   // regenerate cached nudges at least daily
const AGENT_HEALTH_FLUSH_MS = 60_000;              // how often the telemetry tally is flushed
const withTimeout = <T,>(p: Promise<T>, msg: string): Promise<T> =>
    Promise.race([
        p,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`${msg} (timed out after ${FIRESTORE_TIMEOUT_MS / 1000}s)`)), FIRESTORE_TIMEOUT_MS)
        ),
    ]);

const normalizeWardrobeMoodSignals = (item: ClothingItem): ClothingItem => {
    const moodIds = moodIdsForStyling(item);
    const existingTags = Array.isArray(item.aiTags) ? item.aiTags.filter((tag) => typeof tag === 'string') : [];
    return {
        ...item,
        aiTags: [...new Set([...existingTags, ...moodIds])],
        userMoods: moodIds,
    };
};

export const WardrobeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const uid = user?.uid || null;

    // --- State ---
    const [clothes, setClothes] = useState<ClothingItem[]>([]);
    const [outfits, setOutfits] = useState<WearRecord[]>([]);
    const [bookmarkedItems, setBookmarkedItems] = useState<string[]>([]);
    const [tryItItemIds, setTryItItemIds] = useState<string[]>([]);
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
    const [currentMood, setCurrentMood] = useState<FashionMood | null>(null);
    const [insights, setInsights] = useState<UserInsight | null>(null);
    const [suggestionEvents, setSuggestionEvents] = useState<SuggestionEvent[]>([]);

    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const normalizeLegacyThumbnails = useCallback(async (items: ClothingItem[]) => {
        if (!uid) return;

        const candidates = items.filter(item =>
            !item.id.startsWith('demo-') &&
            (item.thumbnailVersion ?? 0) < THUMBNAIL_VERSION &&
            Boolean(item.sourceImageUrl || item.imageUrl)
        );
        if (candidates.length === 0) return;

        for (const item of candidates) {
            try {
                const source = item.sourceImageUrl || item.imageUrl;
                if (!source) continue;

                const sourceDataUrl = await toDataUrl(source);
                if (!sourceDataUrl) continue;

                const fallbackBox: ItemBoundingBox = { x: 0, y: 0, width: 1, height: 1 };
                const cropped = await cropImageToBoundingBox(
                    sourceDataUrl,
                    item.detectionBox || fallbackBox,
                    item.detectionConfidence,
                    {
                        minConfidence: 0,
                        paddingRatio: item.detectionBox ? 0.05 : 0,
                        zoomInFactor: item.detectionBox ? 1.2 : 1,
                        targetWidth: 510,
                        targetHeight: 680,
                    }
                );
                const optimized = await compressImage(cropped.image, 510, 0.85);
                const uploadedUrl = await storageService.uploadClothingImage(uid, item.id, optimized);
                const cacheBustedUrl = `${uploadedUrl}${uploadedUrl.includes('?') ? '&' : '?'}tv=${THUMBNAIL_VERSION}`;
                const updates: Partial<ClothingItem> = {
                    imageUrl: cacheBustedUrl,
                    thumbnailUrl: cacheBustedUrl,
                    thumbnailVersion: THUMBNAIL_VERSION,
                };

                await firestoreService.updateClothingItem(uid, item.id, updates);
                setClothes(prev => prev.map(entry => entry.id === item.id ? { ...entry, ...updates } : entry));
            } catch (thumbErr) {
                console.warn(`[Wardrobe] Thumbnail migration skipped for ${item.id}`, thumbErr);
            }
        }
    }, [uid]);

    // --- Load data from Firestore when user logs in ---
    useEffect(() => {
        if (!uid) {
            // User logged out — clear state
            setClothes([]);
            setOutfits([]);
            setBookmarkedItems([]);
            setUserSettings(null);
            setCurrentMood(null);
            setSuggestionEvents([]);
            setError(null);
            return;
        }

        const loadUserData = async () => {
            setIsLoading(true);
            setError(null);
            prodDiag.loadUserDataStart(uid);
            try {
                // Skip migration for new sign-ups to prevent cross-user data leak (localStorage is shared)
                const skipMigration = sessionStorage.getItem('wardrobe_skip_migration') === uid;
                if (skipMigration) {
                    sessionStorage.removeItem('wardrobe_skip_migration');
                }
                if (!skipMigration) {
                    try {
                        await withTimeout(
                            firestoreService.migrateFromLocalStorage(uid),
                            'Migration'
                        );
                        prodDiag.loadUserDataMigration(uid, true);
                    } catch (migErr) {
                        prodDiag.loadUserDataMigration(uid, false, migErr);
                        throw migErr;
                    }
                }

                // Load all data from Firestore
                let items: ClothingItem[];
                let outfitRecords: WearRecord[];
                let settings: UserSettings;
                try {
                    const [itemsRes, outfitRecordsRes, settingsRes] = await withTimeout(
                        Promise.all([
                            firestoreService.getWardrobe(uid),
                            firestoreService.getRecentOutfits(uid, RECENT_OUTFITS_DAYS),
                            firestoreService.getUserSettings(uid),
                        ]),
                        'Firestore fetch'
                    );
                    items = itemsRes;
                    outfitRecords = outfitRecordsRes;
                    settings = settingsRes;
                    prodDiag.loadUserDataFirestore(uid, true);
                } catch (fsErr) {
                    prodDiag.loadUserDataFirestore(uid, false, fsErr);
                    throw fsErr;
                }

                // Auto-migrate stale demo items: delete all demo-* items and repopulate
                // if any demo item has an imageUrl that isn't a stable /demo-images/ path.
                const hasStaleDemoItems = items.some(item =>
                    item.id.startsWith('demo-') &&
                    !item.imageUrl?.startsWith('/demo-images/')
                );
                let finalItems = items;
                if (hasStaleDemoItems) {
                    try {
                        await withTimeout(
                            (async () => {
                                await firestoreService.deleteAllDemoItems(uid);
                                for (const item of DEMO_ITEMS) {
                                    await firestoreService.addClothingItem(uid, item);
                                }
                            })(),
                            'Stale demo migration'
                        );
                        prodDiag.loadUserDataStaleDemo(uid, true);
                        const userItems = items.filter(i => !i.id.startsWith('demo-'));
                        finalItems = [...userItems, ...DEMO_ITEMS];
                    } catch (demoErr) {
                        prodDiag.loadUserDataStaleDemo(uid, false, demoErr);
                        throw demoErr;
                    }
                }

                const normalizedItems = finalItems.map(normalizeWardrobeMoodSignals);
                setClothes(normalizedItems);
                setOutfits(outfitRecords);
                setBookmarkedItems(settings.bookmarkedItems || []);
                setTryItItemIds(settings.tryItItemIds || []);
                setUserSettings(settings);
                void normalizeLegacyThumbnails(normalizedItems);

                // Non-blocking: load the rejection signal (never fails the critical load).
                firestoreService.getRecentSuggestionEvents(uid, SUGGESTION_EVENTS_DAYS)
                    .then(setSuggestionEvents)
                    .catch((e) => console.warn('[Wardrobe] Failed to load suggestion events:', e));

                prodDiag.loadUserDataEnd(uid, normalizedItems.length);
                console.log(`[Wardrobe] Loaded ${items.length} items, ${outfitRecords.length} outfits from Firestore`);
            } catch (err) {
                prodDiag.loadUserDataError(uid, err);
                const msg = (err as Error)?.message || String(err);
                console.error('[Wardrobe] Failed to load data from Firestore:', err);
                const hint = (msg.includes('permission') || msg.includes('Permission') || msg.includes('insufficient'))
                    ? ' Check Firestore rules (see PRODUCTION_FIREBASE_SETUP.md).'
                    : '';
                setError(`Failed to load wardrobe: ${msg}${hint}`);
            } finally {
                setIsLoading(false);
            }
        };

        loadUserData();
    }, [uid, normalizeLegacyThumbnails]);

    // --- Actions ---

    const addClothingItem = useCallback(async (item: Omit<ClothingItem, 'id' | 'dateAdded'>) => {
        if (!uid) return;
        setIsLoading(true);
        try {
            const newItem: ClothingItem = {
                ...item,
                id: crypto.randomUUID(),
                dateAdded: new Date(),
            };
            const moodIds = moodIdsForStyling(newItem);
            newItem.userMoods = moodIds;
            newItem.aiTags = [...new Set([...(Array.isArray(newItem.aiTags) ? newItem.aiTags : []), ...moodIds])];

            // If image is a base64 data URL, upload to Cloud Storage
            if (newItem.imageUrl.startsWith('data:')) {
                prodDiag.storageUploadStart(uid, newItem.id);
                try {
                    const downloadUrl = await withTimeout(
                        storageService.uploadClothingImage(uid, newItem.id, newItem.imageUrl),
                        'Storage upload'
                    );
                    newItem.imageUrl = downloadUrl;
                    if (newItem.thumbnailUrl?.startsWith('data:') || !newItem.thumbnailUrl) {
                        newItem.thumbnailUrl = downloadUrl;
                    }
                    newItem.thumbnailVersion = THUMBNAIL_VERSION;
                    prodDiag.storageUploadEnd(uid, newItem.id);
                } catch (storageErr) {
                    prodDiag.storageUploadError(uid, newItem.id, storageErr);
                    throw storageErr;
                }
            }

            // Save to Firestore
            prodDiag.firestoreWriteStart(uid, 'add');
            try {
                await withTimeout(
                    firestoreService.addClothingItem(uid, newItem),
                    'Firestore add'
                );
                prodDiag.firestoreWriteEnd(uid, 'add');

                // Scan-time color correction: if the user changed color away from the AI's guess, log it as eval data.
                if (newItem.colorSource === 'user' && newItem.aiColor) {
                    const correction: ColorCorrection = {
                        id: crypto.randomUUID(),
                        itemId: newItem.id,
                        imageRef: newItem.imageUrl,
                        aiColor: newItem.aiColor,
                        userColor: { name: newItem.color, hex: newItem.colorHex },
                        model: getActiveProvider().id,
                        createdAt: new Date(),
                    };
                    firestoreService.logColorCorrection(uid, correction).catch(e =>
                        console.warn('[Wardrobe] Failed to log scan color correction:', e));
                }
            } catch (fsErr) {
                prodDiag.firestoreWriteError(uid, 'add', fsErr);
                throw fsErr;
            }

            // Update local state
            setClothes(prev => [newItem, ...prev]);
        } catch (err) {
            const msg = (err as Error)?.message || String(err);
            const hint = (msg.includes('permission') || msg.includes('Permission') || msg.includes('insufficient'))
                ? ' Check Firebase Storage rules and CORS (see PRODUCTION_FIREBASE_SETUP.md).'
                : '';
            setError(`Failed to add item: ${msg}${hint}`);
            console.error(err);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [uid]);

    const updateClothingItem = useCallback(async (id: string, updates: Partial<ClothingItem>) => {
        if (!uid) return;
        try {
            await firestoreService.updateClothingItem(uid, id, updates);
            setClothes(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
        } catch (err) {
            console.error('[Wardrobe] Failed to update item:', err);
            setError('Failed to update item');
        }
    }, [uid]);

    const correctItemColor = useCallback(async (id: string, userColor: { name: string; hex: string }) => {
        if (!uid) return;
        const item = clothes.find(c => c.id === id);
        if (!item) return;
        // Original AI detection — prefer the immutable aiColor; fall back to current fields for legacy items.
        const aiColor = item.aiColor ?? { name: item.color, hex: item.colorHex };
        const updates: Partial<ClothingItem> = {
            color: userColor.name,
            colorHex: userColor.hex,
            colorSource: 'user',
        };
        try {
            await firestoreService.updateClothingItem(uid, id, updates);
            setClothes(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));

            // Log the {AI → user} pair as eval data. Best-effort: a failed log must not block the fix.
            const correction: ColorCorrection = {
                id: crypto.randomUUID(),
                itemId: id,
                imageRef: item.imageUrl,
                aiColor,
                userColor,
                model: getActiveProvider().id,
                createdAt: new Date(),
            };
            firestoreService.logColorCorrection(uid, correction).catch(err =>
                console.warn('[Wardrobe] Failed to log color correction:', err));
        } catch (err) {
            console.error('[Wardrobe] Failed to correct color:', err);
            setError('Failed to update color');
        }
    }, [uid, clothes]);

    const deleteClothingItem = useCallback(async (id: string) => {
        if (!uid) return;
        try {
            // Delete image from Storage + doc from Firestore
            await Promise.all([
                storageService.deleteClothingImage(uid, id),
                firestoreService.deleteClothingItem(uid, id),
            ]);
            setClothes(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            console.error('[Wardrobe] Failed to delete item:', err);
            setError('Failed to delete item');
        }
    }, [uid]);

    const incrementWearCount = useCallback(async (id: string) => {
        if (!uid) return;
        const item = clothes.find(c => c.id === id);
        if (!item) return;
        const newCount = item.wearFrequency + 1;
        try {
            await firestoreService.updateClothingItem(uid, id, { wearFrequency: newCount });
            setClothes(prev => prev.map(item =>
                item.id === id ? { ...item, wearFrequency: newCount } : item
            ));
        } catch (err) {
            console.error('[Wardrobe] Failed to increment wear count:', err);
        }
    }, [uid, clothes]);

    const decrementWearCount = useCallback(async (id: string) => {
        if (!uid) return;
        const item = clothes.find(c => c.id === id);
        if (!item) return;
        const newCount = Math.max(0, item.wearFrequency - 1);
        try {
            await firestoreService.updateClothingItem(uid, id, { wearFrequency: newCount });
            setClothes(prev => prev.map(item =>
                item.id === id ? { ...item, wearFrequency: newCount } : item
            ));
        } catch (err) {
            console.error('[Wardrobe] Failed to decrement wear count:', err);
        }
    }, [uid, clothes]);

    const logOutfitWear = useCallback(async (outfitItems: string[], moodId: string, weatherData: WeatherData) => {
        if (!uid) return;
        const record: WearRecord = {
            id: crypto.randomUUID(),
            date: new Date(),
            outfitItems,
            mood: moodId,
            weather: weatherData
        };

        try {
            // Save outfit record
            await firestoreService.addOutfit(uid, record);
            setOutfits(prev => [record, ...prev]);

            // Update worn items
            const now = new Date();
            for (const itemId of outfitItems) {
                const item = clothes.find(c => c.id === itemId);
                if (item) {
                    await firestoreService.updateClothingItem(uid, itemId, {
                        wearFrequency: item.wearFrequency + 1,
                        lastWorn: now,
                    });
                }
            }

            setClothes(prev => prev.map(item => {
                if (outfitItems.includes(item.id)) {
                    return {
                        ...item,
                        wearFrequency: item.wearFrequency + 1,
                        lastWorn: now,
                    };
                }
                return item;
            }));
        } catch (err) {
            console.error('[Wardrobe] Failed to log outfit:', err);
            setError('Failed to log outfit');
        }
    }, [uid, clothes]);

    const toggleOutfitFavorite = useCallback(async (id: string) => {
        if (!uid) return;
        const target = outfits.find(o => o.id === id);
        if (!target) return;
        const favorite = !target.favorite;
        // Optimistic local update; persist best-effort and roll back on failure.
        setOutfits(prev => prev.map(o => o.id === id ? { ...o, favorite } : o));
        try {
            await firestoreService.setOutfitFavorite(uid, id, favorite);
        } catch (err) {
            console.error('[Wardrobe] Failed to update favorite:', err);
            setOutfits(prev => prev.map(o => o.id === id ? { ...o, favorite: !favorite } : o));
        }
    }, [uid, outfits]);

    const refreshWeather = async (lat: number, lon: number) => {
        setIsLoading(true);
        try {
            const data = await weatherService.getCurrentWeather(lat, lon);
            setWeather(data);
            setError(null);
        } catch (err) {
            console.error("Failed to refresh weather", err);
            setError("Could not fetch weather data");
        } finally {
            setIsLoading(false);
        }
    };

    const bookmarkItem = useCallback(async (id: string) => {
        if (!uid) return;
        setBookmarkedItems(prev => {
            if (prev.includes(id)) return prev;
            const updated = [...prev, id];
            firestoreService.updateUserSettings(uid, { bookmarkedItems: updated }).catch(console.error);
            return updated;
        });
    }, [uid]);

    const unbookmarkItem = useCallback(async (id: string) => {
        if (!uid) return;
        setBookmarkedItems(prev => {
            const updated = prev.filter(item => item !== id);
            firestoreService.updateUserSettings(uid, { bookmarkedItems: updated }).catch(console.error);
            return updated;
        });
    }, [uid]);

    const addTryItItem = useCallback(async (itemId: string) => {
        if (!uid) return;
        try {
            const updated = await firestoreService.addTryItItem(uid, itemId);
            setTryItItemIds(updated);
        } catch (err) {
            console.error('[Wardrobe] Failed to save Try It item:', err);
        }
    }, [uid]);

    const removeTryItItem = useCallback(async (itemId: string) => {
        if (!uid) return;
        try {
            const updated = await firestoreService.removeTryItItem(uid, itemId);
            setTryItItemIds(updated);
        } catch (err) {
            console.error('[Wardrobe] Failed to remove Try It item:', err);
        }
    }, [uid]);

    const updateUserSettings = useCallback(async (updates: Partial<UserSettings>) => {
        if (!uid) return;
        try {
            await firestoreService.updateUserSettings(uid, updates);
            setUserSettings(prev => prev ? { ...prev, ...updates } : { bookmarkedItems: [], ...updates });
        } catch (err) {
            console.error('[Wardrobe] Failed to update user settings:', err);
            setError('Failed to update settings');
        }
    }, [uid]);

    const setMood = (mood: FashionMood) => setCurrentMood(mood);

    // --- Demo Data Population ---
    const populateDemoData = useCallback(async () => {
        if (!uid) return;
        setIsLoading(true);

        try {
            // 1. Delete all existing demo items before repopulating
            await withTimeout(firestoreService.deleteAllDemoItems(uid), 'Delete demo items');

            // 2. Add fresh DEMO_ITEMS (wearFrequency: 0, lastWorn: null for clean play-around)
            for (const item of DEMO_ITEMS) {
                await withTimeout(firestoreService.addClothingItem(uid, item), 'Add demo item');
            }
            // Keep any user-uploaded items alongside fresh demo items
            setClothes(prev => [...prev.filter(i => !i.id.startsWith('demo-')), ...DEMO_ITEMS]);

            // 3. Clear outfit history so user starts with clean slate
            await withTimeout(firestoreService.deleteAllOutfits(uid), 'Delete outfits');
            setOutfits([]);
        } catch (err) {
            const msg = (err as Error)?.message || String(err);
            console.error('[Wardrobe] Failed to populate demo data:', err);
            const hint = (msg.includes('permission') || msg.includes('Permission') || msg.includes('insufficient'))
                ? ' Check Firestore rules (see PRODUCTION_FIREBASE_SETUP.md).'
                : '';
            setError(`Failed to populate demo: ${msg}${hint}`);
        } finally {
            setIsLoading(false);
        }
    }, [uid]);

    /**
     * Batch-add starter-picker accepts as REAL items (normal UUIDs — not demo items). Images are
     * public /catalog-images/ paths, so no Storage upload is involved; one atomic Firestore batch.
     */
    const addCatalogItems = useCallback(async (payloads: Array<Omit<ClothingItem, 'id' | 'dateAdded'>>) => {
        if (!uid || payloads.length === 0) return;
        const items: ClothingItem[] = payloads.map((p) => ({
            ...p,
            id: crypto.randomUUID(),
            dateAdded: new Date(),
        }));
        await withTimeout(firestoreService.addClothingItems(uid, items), 'Add starter items');
        setClothes(prev => [...items, ...prev]);
    }, [uid]);

    // --- Suggestion rejection logging (feeds Stylist personalization) ---
    const logSuggestionEvent = useCallback(async (
        action: SuggestionEvent['action'],
        itemIds: string[],
        moodId: string,
    ) => {
        if (!uid || itemIds.length === 0) return;
        const event: SuggestionEvent = {
            id: crypto.randomUUID(),
            action,
            itemIds,
            mood: moodId,
            date: new Date(),
        };
        // Optimistic local update so the signal is available immediately this session.
        setSuggestionEvents(prev => [event, ...prev]);
        firestoreService.logSuggestionEvent(uid, event).catch(e =>
            console.warn('[Wardrobe] Failed to log suggestion event:', e));
    }, [uid]);

    // --- Demo cleanup (one-tap, after the demo tour) ---
    const clearDemoItems = useCallback(async () => {
        if (!uid) return;
        try {
            await firestoreService.deleteAllDemoItems(uid);
            setClothes(prev => prev.filter(item => !item.id.startsWith('demo-')));
        } catch (err) {
            console.error('[Wardrobe] Failed to clear demo items:', err);
            setError('Failed to clear demo items');
        }
    }, [uid]);

    // --- Insights ---
    // Analytics (counts, least/most worn, weekly pattern) are deterministic and recomputed in code.
    // Only the LLM nudge copy is expensive, so we cache just that in Firestore keyed by a signature
    // of the wear state — repeat visits skip the Bedrock call entirely unless something changed.
    const fetchInsights = async () => {
        if (!uid) return;
        setIsLoading(true);
        setError(null);
        try {
            const season = getCurrentSeason();
            const cutoff = Date.now() - RECENT_WEAR_DAYS * 24 * 60 * 60 * 1000;
            const recentHistory = outfits.filter((record) => {
                const time = (record.date instanceof Date ? record.date : new Date(record.date)).getTime();
                return Number.isFinite(time) && time >= cutoff;
            });
            const signature = `${season}:${outfits.length}:${computeSeasonalLeastWornIds(clothes, outfits).join(',')}`;

            const cached = await firestoreService.getInsightsCache(uid).catch(() => null);
            const cacheFresh = cached
                && cached.signature === signature
                && cached.nudges.length > 0
                && Date.now() - new Date(cached.computedAt).getTime() < INSIGHTS_MAX_AGE_MS;

            if (cacheFresh && cached) {
                setInsights({
                    ...computeBehavioralAnalytics(clothes, recentHistory, season),
                    suggestedVariations: cached.nudges,
                });
                return;
            }

            const result = await withTimeout(
                awsNovaService.generateInsights(clothes, outfits),
                'AI insights'
            );
            setInsights(result);
            // Persist just the nudges so the next visit can skip the Bedrock call (best-effort).
            firestoreService.saveInsightsCache(uid, result.suggestedVariations, signature)
                .catch((e) => console.warn('[Wardrobe] Failed to cache insights:', e));
        } catch (err) {
            console.error("Error fetching insights:", err);
            setError("Failed to generate AI insights.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- Agent health telemetry flush ---
    // Periodically drain the in-memory KPI tally into a daily Firestore aggregate so agent
    // fallback rate is observable in production. Best-effort; never blocks the UI.
    useEffect(() => {
        if (!uid) return;
        const flush = () => {
            const counts = drainAgentMetricTally();
            if (Object.keys(counts).length === 0) return;
            const dateKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
            firestoreService.recordAgentHealth(uid, dateKey, counts)
                .catch((e) => console.warn('[Wardrobe] Failed to flush agent health:', e));
        };
        const onVisibility = () => { if (document.hidden) flush(); };
        const interval = window.setInterval(flush, AGENT_HEALTH_FLUSH_MS);
        window.addEventListener('pagehide', flush);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener('pagehide', flush);
            document.removeEventListener('visibilitychange', onVisibility);
            flush();
        };
    }, [uid]);

    return (
        <WardrobeContext.Provider value={{
            clothes,
            outfits,
            currentMood,
            weather,
            insights,
            isLoading,
            error,
            clearError: () => setError(null),
            addClothingItem,
            updateClothingItem,
            correctItemColor,
            deleteClothingItem,
            incrementWearCount,
            decrementWearCount,
            logOutfitWear,
            toggleOutfitFavorite,
            setMood,
            refreshWeather,
            fetchInsights,
            populateDemoData,
            clearDemoItems,
            addCatalogItems,
            suggestionEvents,
            logSuggestionEvent,
        bookmarkedItems,
        bookmarkItem,
        unbookmarkItem,
        userSettings,
        updateUserSettings,
        tryItItemIds,
        addTryItItem,
        removeTryItItem,
        }}>
            {children}
        </WardrobeContext.Provider>
    );
};

export const useWardrobe = () => {
    const context = useContext(WardrobeContext);
    if (context === undefined) {
        throw new Error('useWardrobe must be used within a WardrobeProvider');
    }
    return context;
};

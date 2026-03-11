import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
    type ClothingItem,
    type FashionMood,
    type WeatherData,
    type WearRecord,
    type WardrobeContextType,
    type UserInsight,
} from '../types';
import { type UserSettings } from '../services/firestoreService';
import { weatherService } from '../services/weatherService';
import { firestoreService } from '../services/firestoreService';
import { storageService } from '../services/storageService';
import { useAuth } from './AuthContext';
import { subDays } from 'date-fns';
import { DEMO_ITEMS } from '../data/demoItems';

import { awsNovaService } from "../services/awsNova";

const WardrobeContext = createContext<WardrobeContextType | undefined>(undefined);


export const WardrobeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const uid = user?.uid || null;

    // --- State ---
    const [clothes, setClothes] = useState<ClothingItem[]>([]);
    const [outfits, setOutfits] = useState<WearRecord[]>([]);
    const [bookmarkedItems, setBookmarkedItems] = useState<string[]>([]);
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
    const [currentMood, setCurrentMood] = useState<FashionMood | null>(null);
    const [insights, setInsights] = useState<UserInsight | null>(null);

    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Load data from Firestore when user logs in ---
    useEffect(() => {
        if (!uid) {
            // User logged out — clear state
            setClothes([]);
            setOutfits([]);
            setBookmarkedItems([]);
            setUserSettings(null);
            setCurrentMood(null);
            setError(null);
            return;
        }

        const loadUserData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Attempt migration from localStorage (no-op if Firestore already has data)
                await firestoreService.migrateFromLocalStorage(uid);

                // Load all data from Firestore
                const [items, outfitRecords, settings] = await Promise.all([
                    firestoreService.getWardrobe(uid),
                    firestoreService.getOutfits(uid),
                    firestoreService.getUserSettings(uid),
                ]);

                setClothes(items);
                setOutfits(outfitRecords);
                setBookmarkedItems(settings.bookmarkedItems || []);
                setUserSettings(settings);

                console.log(`[Wardrobe] Loaded ${items.length} items, ${outfitRecords.length} outfits from Firestore`);
            } catch (err) {
                console.error('[Wardrobe] Failed to load data from Firestore:', err);
                setError('Failed to load your wardrobe. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        loadUserData();
    }, [uid]);

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

            // If image is a base64 data URL, upload to Cloud Storage
            if (newItem.imageUrl.startsWith('data:')) {
                const downloadUrl = await storageService.uploadClothingImage(uid, newItem.id, newItem.imageUrl);
                newItem.imageUrl = downloadUrl;
            }

            // Save to Firestore
            await firestoreService.addClothingItem(uid, newItem);

            // Update local state
            setClothes(prev => [newItem, ...prev]);
        } catch (err) {
            setError("Failed to add item");
            console.error(err);
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
            // 1. Set Items — save each to Firestore
            for (const item of DEMO_ITEMS) {
                await firestoreService.addClothingItem(uid, item);
            }
            setClothes(DEMO_ITEMS);

            // 2. Generate Mock Wear History (last 7 days)
            const mockHistory: WearRecord[] = [];
            const today = new Date();

            for (let i = 0; i < 5; i++) {
                const date = subDays(today, i + 1);
                const top = DEMO_ITEMS[0];
                const bottom = DEMO_ITEMS[2];
                const shoe = DEMO_ITEMS[5];

                const record: WearRecord = {
                    id: `hist-${i}`,
                    date: date,
                    outfitItems: [top.id, bottom.id, shoe.id],
                    mood: 'minimal-chic',
                    weather: {
                        temperature: 20 + i,
                        feelsLike: 21 + i,
                        condition: i % 2 === 0 ? 'Sunny' : 'Cloudy',
                        humidity: 50,
                        windSpeed: 10,
                        location: 'Demo City'
                    }
                };
                mockHistory.push(record);
                await firestoreService.addOutfit(uid, record);
            }
            setOutfits(mockHistory);
        } catch (err) {
            console.error('[Wardrobe] Failed to populate demo data:', err);
            setError('Failed to populate demo data');
        } finally {
            setIsLoading(false);
        }
    }, [uid]);

    // --- Insights Calculation ---
    // Instead of computing locally, we call the Behavioral Agent!
    const fetchInsights = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await awsNovaService.generateInsights(clothes, outfits);
            setInsights(result);
        } catch (err) {
            console.error("Error fetching insights:", err);
            setError("Failed to generate AI insights.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <WardrobeContext.Provider value={{
            clothes,
            outfits,
            currentMood,
            weather,
            insights,
            isLoading,
            error,
            addClothingItem,
            updateClothingItem,
            deleteClothingItem,
            incrementWearCount,
            decrementWearCount,
            logOutfitWear,
            setMood,
            refreshWeather,
            fetchInsights,
            populateDemoData,
            bookmarkedItems,
            bookmarkItem,
            unbookmarkItem,
            userSettings,
            updateUserSettings
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

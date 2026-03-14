import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
    type ClothingItem,
    type FashionMood,
    type WeatherData,
    type WearRecord,
    type WardrobeContextType,
    type UserInsight,
    ClothingCategory,
    Season
} from '../types';
import { weatherService } from '../services/weatherService';
import { startOfWeek, isSameDay, addDays, subDays } from 'date-fns';

const WardrobeContext = createContext<WardrobeContextType | undefined>(undefined);



// --- Demo Data ---
const DEMO_ITEMS: ClothingItem[] = [
    {
        id: 'demo-1',
        imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Tops,
        subcategory: 'White T-shirt',
        color: 'White',
        colorHex: '#FFFFFF',
        pattern: 'Solid',
        season: [Season.Spring, Season.Summer, Season.Fall, Season.Winter],
        wearFrequency: 15,
        lastWorn: subDays(new Date(), 2),
        dateAdded: subDays(new Date(), 30),
        aiTags: ['basic', 'casual', 'essential'],
        userNotes: 'Staple piece'
    },
    {
        id: 'demo-2',
        imageUrl: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Tops,
        subcategory: 'White Shirt',
        color: 'White',
        colorHex: '#FFFFFF',
        pattern: 'Solid',
        season: [Season.Spring, Season.Summer, Season.Fall, Season.Winter],
        wearFrequency: 8,
        lastWorn: subDays(new Date(), 5),
        dateAdded: subDays(new Date(), 40),
        aiTags: ['formal', 'office', 'essential']
    },
    {
        id: 'demo-3',
        imageUrl: 'https://images.unsplash.com/photo-1542272617-08f083157f5d?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Bottoms,
        subcategory: 'Jeans',
        color: 'Blue',
        colorHex: '#3b82f6',
        pattern: 'Solid',
        season: [Season.Spring, Season.Fall, Season.Winter],
        wearFrequency: 22,
        lastWorn: subDays(new Date(), 1),
        dateAdded: subDays(new Date(), 45),
        aiTags: ['denim', 'casual', 'staple']
    },
    {
        id: 'demo-4',
        imageUrl: 'https://images.unsplash.com/photo-1554568218-0f1715e72254?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Tops,
        subcategory: 'Cardigan',
        color: 'Grey',
        colorHex: '#9ca3af',
        pattern: 'Solid',
        season: [Season.Spring, Season.Fall],
        wearFrequency: 12,
        lastWorn: subDays(new Date(), 4),
        dateAdded: subDays(new Date(), 50),
        aiTags: ['layering', 'cozy', 'casual']
    },
    {
        id: 'demo-5',
        imageUrl: 'https://images.unsplash.com/photo-1539533018447-63fcce26515f?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Tops,
        subcategory: 'Hoodie',
        color: 'Grey',
        colorHex: '#9ca3af',
        pattern: 'Solid',
        season: [Season.Fall, Season.Winter],
        wearFrequency: 18,
        lastWorn: subDays(new Date(), 3),
        dateAdded: subDays(new Date(), 60),
        aiTags: ['casual', 'comfort', 'sporty']
    },
    {
        id: 'demo-6',
        imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Shoes,
        subcategory: 'Sneakers',
        color: 'White',
        colorHex: '#f3f4f6',
        pattern: 'Solid',
        season: [Season.Spring, Season.Summer, Season.Fall, Season.Winter],
        wearFrequency: 45,
        lastWorn: new Date(),
        dateAdded: subDays(new Date(), 90),
        aiTags: ['sporty', 'comfortable', 'daily']
    },
    {
        id: 'demo-7',
        imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Outerwear,
        subcategory: 'Jacket',
        color: 'Black',
        colorHex: '#000000',
        pattern: 'Solid',
        season: [Season.Spring, Season.Fall, Season.Winter],
        wearFrequency: 14,
        lastWorn: subDays(new Date(), 10),
        dateAdded: subDays(new Date(), 80),
        aiTags: ['leather', 'edgy', 'layering']
    },
    {
        id: 'demo-8',
        imageUrl: 'https://images.unsplash.com/photo-1539533113208-f6df8cc8b543?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Outerwear,
        subcategory: 'Coat',
        color: 'Beige',
        colorHex: '#d2b48c',
        pattern: 'Solid',
        season: [Season.Fall, Season.Winter],
        wearFrequency: 8,
        lastWorn: subDays(new Date(), 5),
        dateAdded: subDays(new Date(), 60),
        aiTags: ['outerwear', 'classic', 'warm']
    },
    {
        id: 'demo-9',
        imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Tops,
        subcategory: 'Jumper',
        color: 'Cream',
        colorHex: '#fef3c7',
        pattern: 'Solid',
        season: [Season.Winter, Season.Fall],
        wearFrequency: 7,
        lastWorn: subDays(new Date(), 8),
        dateAdded: subDays(new Date(), 25),
        aiTags: ['cozy', 'warm', 'knitwear']
    },
    {
        id: 'demo-10',
        imageUrl: 'https://images.unsplash.com/photo-1588002131980-fc319688bcbd?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Accessories,
        subcategory: 'Muffler',
        color: 'Grey',
        colorHex: '#9ca3af',
        pattern: 'Checked',
        season: [Season.Winter, Season.Fall],
        wearFrequency: 5,
        lastWorn: subDays(new Date(), 12),
        dateAdded: subDays(new Date(), 30),
        aiTags: ['warm', 'accessory', 'winter']
    },
    {
        id: 'demo-11',
        imageUrl: 'https://images.unsplash.com/photo-1576878368867-b52cc8b50f75?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Accessories,
        subcategory: 'Beanie',
        color: 'Black',
        colorHex: '#000000',
        pattern: 'Solid',
        season: [Season.Winter, Season.Fall],
        wearFrequency: 10,
        lastWorn: subDays(new Date(), 7),
        dateAdded: subDays(new Date(), 40),
        aiTags: ['casual', 'hat', 'warm']
    },
    {
        id: 'demo-12',
        imageUrl: 'https://images.unsplash.com/photo-1521369909029-2afed882259d?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Accessories,
        subcategory: 'Cap',
        color: 'Navy',
        colorHex: '#1e3a8a',
        pattern: 'Solid',
        season: [Season.Spring, Season.Summer, Season.Fall],
        wearFrequency: 25,
        lastWorn: subDays(new Date(), 2),
        dateAdded: subDays(new Date(), 100),
        aiTags: ['sporty', 'casual', 'hat']
    },
    {
        id: 'demo-13',
        imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Accessories,
        subcategory: 'Backpack',
        color: 'Black',
        colorHex: '#000000',
        pattern: 'Solid',
        season: [Season.Spring, Season.Summer, Season.Fall, Season.Winter],
        wearFrequency: 30,
        lastWorn: subDays(new Date(), 1),
        dateAdded: subDays(new Date(), 120),
        aiTags: ['bag', 'utility', 'daily']
    },
    {
        id: 'demo-14',
        imageUrl: 'https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Accessories,
        subcategory: 'Crossbag',
        color: 'Brown',
        colorHex: '#78350f',
        pattern: 'Solid',
        season: [Season.Spring, Season.Summer, Season.Fall, Season.Winter],
        wearFrequency: 15,
        lastWorn: subDays(new Date(), 3),
        dateAdded: subDays(new Date(), 80),
        aiTags: ['bag', 'casual', 'accessory']
    },
    {
        id: 'demo-15',
        imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Shoes,
        subcategory: 'Heels',
        color: 'Black',
        colorHex: '#000000',
        pattern: 'Solid',
        season: [Season.Spring, Season.Summer, Season.Fall, Season.Winter],
        wearFrequency: 4,
        lastWorn: subDays(new Date(), 20),
        dateAdded: subDays(new Date(), 50),
        aiTags: ['formal', 'evening', 'elegant']
    }
];

export const WardrobeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- State Initialization ---
    const [clothes, setClothes] = useState<ClothingItem[]>(() => {
        const saved = localStorage.getItem('wardrobe_clothes');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Rehydrate dates
                return parsed.map((item: any) => ({
                    ...item,
                    lastWorn: item.lastWorn ? new Date(item.lastWorn) : null,
                    dateAdded: new Date(item.dateAdded)
                }));
            } catch (e) {
                console.error("Failed to parse wardrobe_clothes", e);
                return [];
            }
        }
        return [];
    });

    const [outfits, setOutfits] = useState<WearRecord[]>(() => {
        const saved = localStorage.getItem('wardrobe_outfits');
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed.map((record: any) => ({
                ...record,
                date: new Date(record.date)
            }));
        }
        return [];
    });

    const [bookmarkedItems, setBookmarkedItems] = useState<string[]>(() => {
        const saved = localStorage.getItem('wardrobe_bookmarks');
        return saved ? JSON.parse(saved) : [];
    });

    const [currentMood, setCurrentMood] = useState<FashionMood | null>(null);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Persistence ---
    useEffect(() => {
        try {
            localStorage.setItem('wardrobe_clothes', JSON.stringify(clothes));
        } catch (e) {
            console.warn("[Wardrobe] localStorage quota exceeded, skipping save", e);
        }
    }, [clothes]);

    useEffect(() => {
        try {
            localStorage.setItem('wardrobe_outfits', JSON.stringify(outfits));
        } catch (e) {
            console.warn("[Wardrobe] localStorage quota exceeded for outfits", e);
        }
    }, [outfits]);

    useEffect(() => {
        try {
            localStorage.setItem('wardrobe_bookmarks', JSON.stringify(bookmarkedItems));
        } catch (e) {
            console.warn("[Wardrobe] localStorage quota exceeded for bookmarks", e);
        }
    }, [bookmarkedItems]);

    // --- Actions ---

    const addClothingItem = (item: Omit<ClothingItem, 'id' | 'dateAdded'>) => {
        setIsLoading(true);
        try {
            const newItem: ClothingItem = {
                ...item,
                id: crypto.randomUUID(),
                dateAdded: new Date(),
            };
            setClothes(prev => [newItem, ...prev]);
        } catch (err) {
            setError("Failed to add item");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const updateClothingItem = (id: string, updates: Partial<ClothingItem>) => {
        setClothes(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const deleteClothingItem = (id: string) => {
        setClothes(prev => prev.filter(item => item.id !== id));
    };

    const incrementWearCount = (id: string) => {
        setClothes(prev => prev.map(item =>
            item.id === id ? { ...item, wearFrequency: item.wearFrequency + 1 } : item
        ));
    };

    const decrementWearCount = (id: string) => {
        setClothes(prev => prev.map(item =>
            item.id === id ? { ...item, wearFrequency: Math.max(0, item.wearFrequency - 1) } : item
        ));
    };

    const logOutfitWear = (outfitItems: string[], moodId: string, weatherData: WeatherData) => {
        const record: WearRecord = {
            id: crypto.randomUUID(),
            date: new Date(),
            outfitItems,
            mood: moodId,
            weather: weatherData
        };
        setOutfits(prev => [record, ...prev]);

        // Update items worn
        setClothes(prev => prev.map(item => {
            if (outfitItems.includes(item.id)) {
                return {
                    ...item,
                    wearFrequency: item.wearFrequency + 1,
                    lastWorn: new Date()
                };
            }
            return item;
        }));
    };

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

    const bookmarkItem = (id: string) => setBookmarkedItems(prev => prev.includes(id) ? prev : [...prev, id]);
    const unbookmarkItem = (id: string) => setBookmarkedItems(prev => prev.filter(item => item !== id));

    const setMood = (mood: FashionMood) => setCurrentMood(mood);

    // --- Demo Data Population ---
    const populateDemoData = () => {
        setIsLoading(true);

        // 1. Set Items
        setClothes(DEMO_ITEMS);

        // 2. Generate Mock Wear History (last 7 days)
        const mockHistory: WearRecord[] = [];
        const today = new Date();

        // Mock data for history
        for (let i = 0; i < 5; i++) {
            const date = subDays(today, i + 1); // Yesterday, day before, etc.
            // Pick items
            const top = DEMO_ITEMS[0]; // White T-shirt
            const bottom = DEMO_ITEMS[2]; // Jeans
            const shoe = DEMO_ITEMS[5]; // Sneakers

            mockHistory.push({
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
            });
        }
        setOutfits(mockHistory);

        setIsLoading(false);
    };

    // --- Insights Calculation ---
    const getInsights = (): UserInsight => {
        // 1. Most Worn Colors
        const colorCounts = clothes.reduce((acc, item) => {
            const key = item.colorHex || '#000000';
            if (!acc[key]) acc[key] = { color: item.color, hex: key, count: 0 };
            acc[key].count += item.wearFrequency;
            return acc;
        }, {} as Record<string, { color: string, hex: string, count: number }>);

        const mostWornColors = Object.values(colorCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // 2. Most & Least Worn Items
        const sortedItems = [...clothes].sort((a, b) => b.wearFrequency - a.wearFrequency);
        const mostWornItems = sortedItems.slice(0, 5).map(item => ({ item, count: item.wearFrequency }));
        const leastWornItems = sortedItems.reverse().slice(0, 5);

        // 3. Weekly Pattern
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 });
        const weeklyWearPattern = Array.from({ length: 7 }, (_, i) => {
            const day = addDays(start, i);
            const count = outfits.filter(o => isSameDay(o.date, day)).length;
            return {
                day: day.toLocaleDateString('en-US', { weekday: 'short' }),
                count
            };
        });

        // 4. Suggestions
        const suggestedVariations: string[] = [];
        if (leastWornItems.length > 0) {
            suggestedVariations.push(`Try wearing your ${leastWornItems[0].subcategory} more often!`);
        }

        return {
            mostWornColors,
            mostWornItems,
            leastWornItems,
            suggestedVariations,
            weeklyWearPattern
        };
    };

    return (
        <WardrobeContext.Provider value={{
            clothes,
            outfits,
            currentMood,
            weather,
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
            getInsights,
            populateDemoData,
            bookmarkedItems,
            bookmarkItem,
            unbookmarkItem
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

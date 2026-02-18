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
        subcategory: 'White Cotton Tee',
        color: 'White',
        colorHex: '#FFFFFF',
        pattern: 'Solid',
        season: [Season.Spring, Season.Summer],
        wearFrequency: 15,
        lastWorn: subDays(new Date(), 2),
        dateAdded: subDays(new Date(), 30),
        aiTags: ['basic', 'casual', 'essential'],
        userNotes: 'Staple piece'
    },
    {
        id: 'demo-2',
        imageUrl: 'https://images.unsplash.com/photo-1542272617-08f083157f5d?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Bottoms,
        subcategory: 'Vintage Levis 501',
        color: 'Blue',
        colorHex: '#3b82f6',
        pattern: 'Solid',
        season: [Season.Spring, Season.Fall, Season.Winter],
        wearFrequency: 22,
        lastWorn: subDays(new Date(), 1),
        dateAdded: subDays(new Date(), 45),
        aiTags: ['denim', 'vintage', 'casual']
    },
    {
        id: 'demo-3',
        imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Outerwear,
        subcategory: 'Classic Trench',
        color: 'Beige',
        colorHex: '#d2b48c',
        pattern: 'Solid',
        season: [Season.Spring, Season.Fall],
        wearFrequency: 8,
        lastWorn: subDays(new Date(), 5),
        dateAdded: subDays(new Date(), 60),
        aiTags: ['chic', 'workwear', 'layering']
    },
    {
        id: 'demo-4',
        imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Shoes,
        subcategory: 'White Sneakers',
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
        id: 'demo-5',
        imageUrl: 'https://images.unsplash.com/photo-1620799140408-ed5341cd2431?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Dresses,
        subcategory: 'Black Slip Dress',
        color: 'Black',
        colorHex: '#000000',
        pattern: 'Solid',
        season: [Season.Summer, Season.Spring],
        wearFrequency: 5,
        lastWorn: subDays(new Date(), 14),
        dateAdded: subDays(new Date(), 20),
        aiTags: ['evening', 'elegant', 'minimal']
    },
    {
        id: 'demo-6',
        imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Tops,
        subcategory: 'Striped Oxford Shirt',
        color: 'Blue',
        colorHex: '#60a5fa',
        pattern: 'Striped',
        season: [Season.Spring, Season.Fall],
        wearFrequency: 10,
        lastWorn: subDays(new Date(), 3),
        dateAdded: subDays(new Date(), 40),
        aiTags: ['preppy', 'work', 'collared']
    },
    {
        id: 'demo-7',
        imageUrl: 'https://images.unsplash.com/photo-1551028919-ac66c5f8b955?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Bottoms,
        subcategory: 'Black Trousers',
        color: 'Black',
        colorHex: '#1f2937',
        pattern: 'Solid',
        season: [Season.Fall, Season.Winter],
        wearFrequency: 18,
        lastWorn: subDays(new Date(), 4),
        dateAdded: subDays(new Date(), 50),
        aiTags: ['formal', 'office', 'tailored']
    },
    {
        id: 'demo-8',
        imageUrl: 'https://images.unsplash.com/photo-1556906781-9a412961d28c?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Shoes,
        subcategory: 'Chelsea Boots',
        color: 'Brown',
        colorHex: '#78350f',
        pattern: 'Solid',
        season: [Season.Fall, Season.Winter],
        wearFrequency: 12,
        lastWorn: subDays(new Date(), 6),
        dateAdded: subDays(new Date(), 70),
        aiTags: ['leather', 'boots', 'autumn']
    },
    {
        id: 'demo-9',
        imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Tops,
        subcategory: 'Chunky Knit Sweater',
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
        imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Accessories,
        subcategory: 'Leather Tote Bag',
        color: 'Tan',
        colorHex: '#d97706',
        pattern: 'Solid',
        season: [Season.Spring, Season.Summer, Season.Fall, Season.Winter],
        wearFrequency: 40,
        lastWorn: new Date(),
        dateAdded: subDays(new Date(), 100),
        aiTags: ['bag', 'accessory', 'daily']
    },
    {
        id: 'demo-11',
        imageUrl: 'https://images.unsplash.com/photo-1617137968427-85924c809a10?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Outerwear,
        subcategory: 'Denim Jacket',
        color: 'Blue',
        colorHex: '#2563eb',
        pattern: 'Solid',
        season: [Season.Spring, Season.Fall],
        wearFrequency: 14,
        lastWorn: subDays(new Date(), 10),
        dateAdded: subDays(new Date(), 80),
        aiTags: ['casual', 'layering', 'denim']
    },
    {
        id: 'demo-12',
        imageUrl: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&q=80&w=500',
        category: ClothingCategory.Tops,
        subcategory: 'Silk Blouse',
        color: 'Red',
        colorHex: '#dc2626',
        pattern: 'Solid',
        season: [Season.Fall, Season.Winter],
        wearFrequency: 3,
        lastWorn: subDays(new Date(), 25),
        dateAdded: subDays(new Date(), 40),
        aiTags: ['formal', 'evening', 'statement']
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

    const [currentMood, setCurrentMood] = useState<FashionMood | null>(null);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- Persistence ---
    useEffect(() => {
        localStorage.setItem('wardrobe_clothes', JSON.stringify(clothes));
    }, [clothes]);

    useEffect(() => {
        localStorage.setItem('wardrobe_outfits', JSON.stringify(outfits));
    }, [outfits]);

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
            // Pick random items
            const top = DEMO_ITEMS[0]; // Tee
            const bottom = DEMO_ITEMS[1]; // Jeans
            const shoe = DEMO_ITEMS[3]; // Sneakers

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
            populateDemoData
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

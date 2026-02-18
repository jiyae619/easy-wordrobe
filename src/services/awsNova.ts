import {
    type ClothingItem,
    ClothingCategory,
    Season,
    type FashionMood,
    type WeatherData,
    type OutfitSuggestion,
    type UserInsight,
    type WearRecord
} from "../types/index";
import { v4 as uuidv4 } from 'uuid';

// ==========================================
// Configuration & Client Initialization
// ==========================================

// FORCE MOCK MODE TO PREVENT BROWSER CRASH
const USE_MOCK = true;

// ==========================================
// Service Implementation
// ==========================================

export const awsNovaService = {
    // Alias for compatibility
    suggestOutfits: async (clothes: ClothingItem[], mood: FashionMood, weather: WeatherData) => {
        return awsNovaService.generateOutfitSuggestions(clothes, mood, weather, []);
    },

    /**
     * Analyzes a clothing image using AWS Nova to extract metadata.
     */
    analyzeClothingImage: async (imageBase64: string): Promise<ClothingItem> => {
        console.log("[AWS Nova Mock] Analyzing image...");
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
        return getMockClothingItem(imageBase64);
    },

    /**
     * Generates outfit suggestions based on wardrobe, mood, and weather.
     */
    generateOutfitSuggestions: async (
        clothes: ClothingItem[],
        mood: FashionMood,
        weather: WeatherData,
        _wearHistory: WearRecord[]
    ): Promise<OutfitSuggestion[]> => {
        console.log("[AWS Nova Mock] Generating outfit suggestions...");
        await new Promise(resolve => setTimeout(resolve, 2000));
        return getMockOutfitSuggestions(clothes, mood);
    },

    /**
     * Generates behavioral insights based on wear history.
     */
    generateInsights: async (
        clothes: ClothingItem[],
        _wearHistory: WearRecord[]
    ): Promise<UserInsight> => {
        // In a real implementation, you would perform some analysis before calling AI
        return getMockInsights(clothes);
    }
};

// ==========================================
// Helper Functions
// ==========================================

// ==========================================
// Mock Data Generators
// ==========================================

function getMockClothingItem(imageBase64: string): ClothingItem {
    return {
        id: uuidv4(),
        imageUrl: imageBase64,
        category: ClothingCategory.Tops,
        subcategory: "Casual T-Shirt",
        color: "Navy Blue",
        colorHex: "#1a1a2e",
        pattern: "Solid",
        season: [Season.Spring, Season.Summer],
        wearFrequency: 0,
        lastWorn: null,
        dateAdded: new Date(),
        aiTags: ["comfortable", "casual", "cotton", "basic"],
        userNotes: "Mock data generated item"
    };
}

function getMockOutfitSuggestions(clothes: ClothingItem[], mood: FashionMood): OutfitSuggestion[] {
    // Pick random 3 items from wardrobe for mock
    const shuffled = [...clothes].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);

    return [
        {
            id: uuidv4(),
            items: selected,
            mood: mood,
            weatherMatch: 95,
            explanation: `This outfit perfectly captures the ${mood.name} vibe with its color coordination.`,
            wearScore: 100
        },
        {
            id: uuidv4(),
            items: shuffled.slice(3, 5),
            mood: mood,
            weatherMatch: 88,
            explanation: "A comfortable alternative that keeps you stylish and protected from the weather.",
            wearScore: 90
        },
        {
            id: uuidv4(),
            items: shuffled.slice(0, 2), // Just 2 items
            mood: mood,
            weatherMatch: 82,
            explanation: "Minimalist approach focusing on your favorite pieces.",
            wearScore: 85
        }
    ];
}

function getMockInsights(clothes: ClothingItem[]): UserInsight {
    return {
        mostWornColors: [
            { color: "Black", hex: "#000000", count: 15 },
            { color: "White", hex: "#FFFFFF", count: 12 }
        ],
        mostWornItems: [],
        leastWornItems: clothes.slice(0, 2),
        suggestedVariations: [
            "You wear a lot of black. Try mixing in your beige chinos for contrast.",
            "Your denim jacket hasn't seen the light of day in 2 weeks!",
            "Great job rotating your shoes this month."
        ],
        weeklyWearPattern: [
            { day: "Mon", count: 2 },
            { day: "Tue", count: 5 },
            { day: "Wed", count: 3 },
            { day: "Thu", count: 4 },
            { day: "Fri", count: 6 },
            { day: "Sat", count: 8 },
            { day: "Sun", count: 3 }
        ]
    };
}

import {
    type ClothingItem,
    type FashionMood,
    type WeatherData,
    type OutfitSuggestion,
    type UserInsight,
    type WearRecord
} from "../types/index";

// Import our refactored modular agents
import { IntakeAgent } from "./agents/IntakeAgent";
import { StylistAgent } from "./agents/StylistAgent";
import { BehavioralAgent } from "./agents/BehavioralAgent";

// ==========================================
// Main AWS Nova Service (Facade / Wrapper)
// ==========================================
// We keep this object structure so that the rest of the app 
// (e.g., Suggest.tsx, Scanner.tsx) doesn't break due to missing imports.

export const awsNovaService = {
    /**
     * Agent 1: Intake Specialist
     * Delegates to IntakeAgent to analyze clothing
     */
    analyzeClothingImage: async (imageBase64: string): Promise<ClothingItem> => {
        return IntakeAgent.analyzeClothingImage(imageBase64);
    },

    /**
     * Agent 2: Personal Stylist
     * Delegates to StylistAgent to generate outfits
     */
    suggestOutfits: async (
        clothes: ClothingItem[],
        mood: FashionMood,
        weather: WeatherData,
        userProfile?: { gender?: string, height?: string, weight?: string }
    ): Promise<OutfitSuggestion[]> => {
        return StylistAgent.generateOutfitSuggestions(clothes, mood, weather, userProfile);
    },

    /**
     * Alias for compatibility with older code if any
     */
    generateOutfitSuggestions: async (
        clothes: ClothingItem[],
        mood: FashionMood,
        weather: WeatherData,
        _wearHistory: WearRecord[],
        userProfile?: { gender?: string, height?: string, weight?: string }
    ): Promise<OutfitSuggestion[]> => {
        return StylistAgent.generateOutfitSuggestions(clothes, mood, weather, userProfile);
    },

    /**
     * Agent 3: Behavioral Insights
     * Delegates to BehavioralAgent to analyze wear history
     */
    generateInsights: async (
        clothes: ClothingItem[],
        wearHistory: WearRecord[]
    ): Promise<UserInsight> => {
        return BehavioralAgent.generateInsights(clothes, wearHistory);
    }
};

// ==========================================
// Helper functions
// ==========================================

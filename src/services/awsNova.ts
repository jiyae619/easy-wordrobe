import {
    type ClothingItem,
    type FashionMood,
    type WeatherData,
    type WeatherOutlookPeriod,
    type OutfitSuggestion,
    type UserInsight,
    type WearRecord
} from "../types/index";

// Import our refactored modular agents
import { IntakeAgent, type IntakeResult, type DetectedClothingItem } from "./agents/IntakeAgent";
import { StylistAgent, type BehavioralContext } from "./agents/StylistAgent";
import { BehavioralAgent } from "./agents/BehavioralAgent";
import { WeatherAgent } from "./agents/WeatherAgent";

export type { BehavioralContext, IntakeResult, DetectedClothingItem };

// ==========================================
// Main AWS Nova Service (Facade / Wrapper)
// ==========================================
// We keep this object structure so that the rest of the app 
// (e.g., Suggest.tsx, Scanner.tsx) doesn't break due to missing imports.

export const awsNovaService = {
    /**
     * Agent 1: Intake Specialist
     * Delegates to IntakeAgent to analyze clothing.
     * Returns IntakeResult which can be success (with item) or failure (with error message).
     */
    analyzeClothingImage: async (imageBase64: string): Promise<IntakeResult> => {
        return IntakeAgent.analyzeClothingImage(imageBase64);
    },

    /**
     * Agent 2: Personal Stylist
     * Delegates to StylistAgent to generate outfits.
     * Accepts optional behavioralContext so BehavioralAgent insights influence recommendations.
     */
    suggestOutfits: async (
        clothes: ClothingItem[],
        mood: FashionMood,
        weather: WeatherData,
        userProfile?: { gender?: string, height?: string, weight?: string },
        behavioralContext?: BehavioralContext
    ): Promise<OutfitSuggestion[]> => {
        return StylistAgent.generateOutfitSuggestions(clothes, mood, weather, userProfile, behavioralContext);
    },

    /**
     * Alias for compatibility with older code if any
     */
    generateOutfitSuggestions: async (
        clothes: ClothingItem[],
        mood: FashionMood,
        weather: WeatherData,
        _wearHistory: WearRecord[],
        userProfile?: { gender?: string, height?: string, weight?: string },
        behavioralContext?: BehavioralContext
    ): Promise<OutfitSuggestion[]> => {
        return StylistAgent.generateOutfitSuggestions(clothes, mood, weather, userProfile, behavioralContext);
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
    },

    generateWeatherCheer: async (
        weather: WeatherData,
        outlook: WeatherOutlookPeriod[]
    ): Promise<string> => {
        return WeatherAgent.generateWeatherCheer(weather, outlook);
    }
};

// ==========================================
// Helper functions
// ==========================================

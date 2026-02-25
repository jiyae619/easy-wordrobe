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
// No AWS SDK needed — using direct HTTP with Bedrock API key (Bearer token)

// ==========================================
// Configuration
// ==========================================

const NOVA_MODEL_ID = "us.amazon.nova-2-lite-v1:0";
const AWS_REGION = import.meta.env.VITE_AWS_REGION || "us-east-2";
const BEDROCK_API_KEY = import.meta.env.VITE_BEDROCK_API_KEY || "";
const BEDROCK_URL = `https://bedrock-runtime.${AWS_REGION}.amazonaws.com/model/${encodeURIComponent(NOVA_MODEL_ID)}/converse`;

// ==========================================
// Service Implementation
// ==========================================

export const awsNovaService = {
    // Alias for compatibility
    suggestOutfits: async (clothes: ClothingItem[], mood: FashionMood, weather: WeatherData) => {
        return awsNovaService.generateOutfitSuggestions(clothes, mood, weather, []);
    },

    /**
     * Analyzes a clothing image using Amazon Nova Lite 2 via Bedrock Converse API.
     * Uses Bedrock API key (Bearer token) — no AWS SDK or IAM credentials needed.
     */
    analyzeClothingImage: async (imageBase64: string): Promise<ClothingItem> => {
        console.log("[AWS Nova Lite 2] Analyzing clothing image via Bedrock API key...");

        // Strip the data URI prefix (e.g. "data:image/jpeg;base64,") if present
        const base64Data = imageBase64.includes(",")
            ? imageBase64.split(",")[1]
            : imageBase64;

        // Detect format from the data URI
        let format = "jpeg";
        if (imageBase64.startsWith("data:")) {
            const match = imageBase64.match(/^data:image\/(\w+);/);
            if (match) format = match[1];
        }

        const prompt = `You are a fashion AI assistant. Analyze this clothing item image and return ONLY a JSON object with these fields:
{
  "category": one of "tops", "bottoms", "outerwear", "dresses", "shoes", "accessories", "bags",
  "subcategory": specific type like "Crew Neck T-Shirt", "Denim Jeans", "Running Shoes", etc.,
  "color": the primary color name like "Navy Blue", "Forest Green", "Cream",
  "colorHex": the hex code for the primary color like "#1B2A4A",
  "pattern": one of "solid", "striped", "plaid", "floral", "graphic", "abstract", "animal print", "polka dot",
  "season": array of suitable seasons from ["spring", "summer", "fall", "winter"],
  "aiTags": array of 3-6 descriptive tags like ["casual", "cotton", "breathable", "everyday"]
}
Return ONLY valid JSON, no markdown, no explanation.`;

        try {
            const payload = {
                messages: [
                    {
                        role: "user",
                        content: [
                            {
                                image: {
                                    format,
                                    source: { bytes: base64Data },
                                },
                            },
                            {
                                text: prompt,
                            },
                        ],
                    },
                ],
                inferenceConfig: {
                    maxTokens: 512,
                    temperature: 0.2,
                },
            };

            const response = await fetch(BEDROCK_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${BEDROCK_API_KEY}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Bedrock API error ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            const outputText = result?.output?.message?.content?.[0]?.text || "";

            console.log("[AWS Nova Lite 2] Raw response:", outputText);

            // Parse the JSON from the response (handle possible markdown wrapping)
            let jsonStr = outputText.trim();
            if (jsonStr.startsWith("```")) {
                jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
            }

            const parsed = JSON.parse(jsonStr);

            // Validate and map to ClothingItem
            const validCategories = Object.values(ClothingCategory);
            const category = validCategories.includes(parsed.category)
                ? parsed.category
                : ClothingCategory.Tops;

            const validSeasons = Object.values(Season);
            const season = Array.isArray(parsed.season)
                ? parsed.season.filter((s: string) => validSeasons.includes(s as Season))
                : [Season.Spring];

            return {
                id: uuidv4(),
                imageUrl: imageBase64,
                category,
                subcategory: parsed.subcategory || "Unknown",
                color: parsed.color || "Unknown",
                colorHex: parsed.colorHex || "#000000",
                pattern: parsed.pattern || "solid",
                season: season.length > 0 ? season : [Season.Spring],
                wearFrequency: 0,
                lastWorn: null,
                dateAdded: new Date(),
                aiTags: Array.isArray(parsed.aiTags) ? parsed.aiTags : [],
                userNotes: "",
            };
        } catch (error) {
            console.error("[AWS Nova Lite 2] Analysis failed, falling back to mock:", error);
            return getMockClothingItem(imageBase64);
        }
    },

    /**
     * Generates outfit suggestions based on wardrobe, mood, and weather.
     */
    generateOutfitSuggestions: async (
        clothes: ClothingItem[],
        mood: FashionMood,
        _weather: WeatherData,
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

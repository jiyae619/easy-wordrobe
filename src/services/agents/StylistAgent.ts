import {
    type ClothingItem,
    type FashionMood,
    type WeatherData,
    type OutfitSuggestion,
    ClothingCategory
} from "../../types/index";
import { v4 as uuidv4 } from 'uuid';
import { callBedrockConverseAPI } from "../bedrockClient";

export const StylistAgent = {
    /**
     * Agent 2: Personal Stylist
     * Generates logical and aesthetic outfit combinations based on entire wardrobe, mood, and weather.
     */
    generateOutfitSuggestions: async (
        clothes: ClothingItem[],
        mood: FashionMood,
        weather: WeatherData,
        userProfile?: { gender?: string, height?: string, weight?: string }
    ): Promise<OutfitSuggestion[]> => {
        console.log("[Stylist Agent] Generating outfits...");

        // 1. Prepare Wardrobe JSON context (limit fields to save tokens)
        const wardrobeContext = clothes.map(c => ({
            id: c.id,
            category: c.category,
            subcategory: c.subcategory,
            color: c.color,
            season: c.season,
            aiTags: c.aiTags
        }));

        const profileContext = userProfile
            ? `User Profile: Gender: ${userProfile.gender || 'Not specified'}, Height: ${userProfile.height || 'Not specified'}, Weight: ${userProfile.weight || 'Not specified'}.`
            : "User Profile: Not specified.";

        // Prompt tailored to output top/bottom/shoes and engaging commentary
        const prompt = `You are a high-end Personal Stylist Agent.
Your client needs logical and aesthetic outfit combinations that optimize their fashion style.

CONDITIONS:
- Current Weather: ${weather.temperature}° (Feels like ${weather.feelsLike}°), ${weather.condition}.
- Desired Mood/Vibe: ${mood.name} (${mood.description})
- ${profileContext}

AVAILABLE WARDROBE (JSON format):
${JSON.stringify(wardrobeContext)}

TASK:
Create 3 different outfit combinations.
For each outfit, provide the IDs of the items used. You MUST include a top, a bottom, and shoes. You may optionally include outerwear or accessories.
Provide a brief explanation of why it works, and an engaging one-sentence comment for the user.
Output strictly as a JSON array of objects, with NO markdown formatting around it:
[
  {
    "itemIds": ["id1", "id2", "id3"],
    "moodName": "${mood.name}",
    "weatherMatch": 95,
    "wearScore": 90,
    "explanation": "Provides a styling explanation considering weather, colors, and the user's profile.",
    "comment": "An engaging one-sentence hype comment! (e.g. 'You are going to rock this look at the office today!')"
  }
]`;

        try {
            const payload = {
                messages: [{ role: "user", content: [{ text: prompt }] }],
                inferenceConfig: { maxTokens: 1000, temperature: 0.6 },
            };

            const jsonStr = await callBedrockConverseAPI(payload);
            const aiSuggestions = JSON.parse(jsonStr);

            // 2. Map AI output back to the TypeScript interface
            return aiSuggestions.map((suggestion: any) => {
                const outfitItems = suggestion.itemIds
                    .map((id: string) => clothes.find(c => c.id === id))
                    .filter(Boolean);

                return {
                    id: uuidv4(),
                    items: outfitItems,
                    mood: mood,
                    weatherMatch: suggestion.weatherMatch || 80,
                    wearScore: suggestion.wearScore || 80,
                    explanation: suggestion.explanation + (suggestion.comment ? " " + suggestion.comment : "")
                };
            });

        } catch (error) {
            console.error("[Stylist Agent] Failed to generate outfits, falling back to mock:", error);
            return getMockOutfitSuggestions(clothes, mood);
        }
    }
};

// ==========================================
// Mock Data Generators for Stylist Agent
// ==========================================
function getMockOutfitSuggestions(clothes: ClothingItem[], mood: FashionMood): OutfitSuggestion[] {
    const tops = clothes.filter(c => c.category === ClothingCategory.Tops);
    const bottoms = clothes.filter(c => c.category === ClothingCategory.Bottoms);
    const shoes = clothes.filter(c => c.category === ClothingCategory.Shoes);
    const outerwear = clothes.filter(c => c.category === ClothingCategory.Outerwear);
    const accessories = clothes.filter(c => c.category === ClothingCategory.Accessories);

    const getRandomItem = (arr: ClothingItem[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

    const createOutfit = () => {
        const top = getRandomItem(tops);
        const bottom = getRandomItem(bottoms);
        const shoe = getRandomItem(shoes);
        const items = [top, bottom, shoe].filter(Boolean) as ClothingItem[];

        if (Math.random() > 0.5) {
            const out = getRandomItem(outerwear);
            if (out && !items.includes(out)) items.push(out);
        }
        if (Math.random() > 0.3) {
            const acc = getRandomItem(accessories);
            if (acc && !items.includes(acc)) items.push(acc);
        }
        return items;
    };

    return [
        {
            id: uuidv4(),
            items: createOutfit(),
            mood: mood,
            weatherMatch: 95,
            explanation: `This outfit perfectly captures the ${mood.name} vibe with its color coordination.`,
            wearScore: 100
        },
        {
            id: uuidv4(),
            items: createOutfit(),
            mood: mood,
            weatherMatch: 88,
            explanation: "A comfortable alternative that keeps you stylish and protected from the weather.",
            wearScore: 90
        }
    ];
}

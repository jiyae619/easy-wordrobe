import {
    type ClothingItem,
    type FashionMood,
    type WeatherData,
    type OutfitSuggestion,
    ClothingCategory
} from "../../types/index";
import { v4 as uuidv4 } from 'uuid';
import { callBedrockConverseAPI } from "../bedrockClient";

export type BehavioralContext = {
    /** Items flagged by BehavioralAgent as unworn for 3+ weeks in the current season */
    leastWornItemIds: string[];
    /** Items the user explicitly tapped "Try it" on from the Insights page */
    tryItItemIds: string[];
};

export const StylistAgent = {
    /**
     * Agent 2: Personal Stylist
     * Generates logical and aesthetic outfit combinations based on entire wardrobe, mood, and weather.
     * Optionally receives behavioralContext from BehavioralAgent to prioritize neglected items
     * and items the user explicitly wants to try.
     */
    generateOutfitSuggestions: async (
        clothes: ClothingItem[],
        mood: FashionMood,
        weather: WeatherData,
        userProfile?: { gender?: string, height?: string, weight?: string },
        behavioralContext?: BehavioralContext
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

        // Build behavioral priority hint for the prompt
        const tryItIds = behavioralContext?.tryItItemIds ?? [];
        const leastWornIds = behavioralContext?.leastWornItemIds ?? [];
        const priorityIds = [...new Set([...tryItIds, ...leastWornIds])];
        const priorityItems = wardrobeContext.filter(c => priorityIds.includes(c.id));

        const behavioralHint = priorityItems.length > 0
            ? `\nBEHAVIORAL PRIORITY ITEMS (incorporate at least one of these across your 3 outfits — the user wants to wear these more):
${JSON.stringify(priorityItems)}
${tryItIds.length > 0 ? `USER "TRY IT" REQUESTS (highest priority — the user explicitly asked to wear these): ${JSON.stringify(tryItIds)}` : ''}`
            : '';

        // Prompt tailored to output clothing combinations and engaging commentary
        const prompt = `You are a high-end Personal Stylist Agent.
Your client needs logical and aesthetic outfit combinations that optimize their fashion style.

CONDITIONS:
- Current Weather: ${weather.temperature}° (Feels like ${weather.feelsLike}°), ${weather.condition}.
- Desired Mood/Vibe: ${mood.name} (${mood.description})
- ${profileContext}
${behavioralHint}
AVAILABLE WARDROBE (JSON format):
${JSON.stringify(wardrobeContext)}

TASK:
Create 3 different outfit combinations using ONLY the available items.
For each outfit, provide the IDs of the items used. Create outfits from these categories:
- REQUIRED: A top OR dress (one or the other, not both)
- REQUIRED: Bottoms (if using a top, not if using a dress)
- OPTIONAL: Outerwear (jacket, coat, cardigan, etc.)

Provide a brief explanation of why it works, and an engaging one-sentence comment for the user.
Output strictly as a JSON array of objects, with NO markdown formatting around it:
[
  {
    "itemIds": ["id1", "id2", "id3"],
    "moodName": "${mood.name}",
    "weatherMatch": 95,
    "wearScore": 90,
    "explanation": "Write 2-3 sentences of self-contained outfit copy — no label prefix needed. Reference the specific colors and item types actually in this outfit. Vary your tone freely across the 3 outfits: one can be punchy and hype, one poetic or editorial, one warm and encouraging. Close every explanation with a single sentence that makes the user genuinely excited to put it on."
  }
]`;

        try {
            const payload = {
                messages: [{ role: "user", content: [{ text: prompt }] }],
                inferenceConfig: { maxTokens: 1000, temperature: 0.75 },
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
                    explanation: suggestion.explanation
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

function buildFallbackExplanation(items: ClothingItem[], mood: FashionMood, tone: 'hype' | 'editorial' | 'warm'): string {
    const names = items.map(i => `${i.color} ${i.subcategory}`).join(', ');
    const moodName = mood.name.toLowerCase();
    switch (tone) {
        case 'hype':
            return `${names} — this combo hits different. The colors lock in perfectly and the whole look screams ${moodName} without even trying. Step out and own it today.`;
        case 'editorial':
            return `There's a quiet confidence in pairing ${names}. Each piece earns its place, and together they speak the language of ${moodName} fluently. Consider this your look of the day.`;
        case 'warm':
        default:
            return `${names} makes for a look that feels just right — effortlessly ${moodName} and totally you. You're going to feel great in this one.`;
    }
}

function getMockOutfitSuggestions(clothes: ClothingItem[], mood: FashionMood): OutfitSuggestion[] {
    const tops = clothes.filter(c => c.category === ClothingCategory.Tops);
    const bottoms = clothes.filter(c => c.category === ClothingCategory.Bottoms);
    const dresses = clothes.filter(c => c.category === ClothingCategory.Dresses);
    const outerwear = clothes.filter(c => c.category === ClothingCategory.Outerwear);

    const getRandomItem = (arr: ClothingItem[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

    const createOutfit = () => {
        const items: ClothingItem[] = [];
        const dress = getRandomItem(dresses);
        if (dress && Math.random() > 0.5) {
            items.push(dress);
        } else {
            const top = getRandomItem(tops);
            const bottom = getRandomItem(bottoms);
            if (top) items.push(top);
            if (bottom) items.push(bottom);
        }
        if (Math.random() > 0.5) {
            const out = getRandomItem(outerwear);
            if (out && !items.includes(out)) items.push(out);
        }
        return items;
    };

    const tones: Array<'hype' | 'editorial' | 'warm'> = ['hype', 'editorial', 'warm'];
    const shuffledTones = tones.sort(() => Math.random() - 0.5);

    return [0, 1].map((i) => {
        const outfitItems = createOutfit();
        return {
            id: uuidv4(),
            items: outfitItems,
            mood,
            weatherMatch: i === 0 ? 95 : 88,
            wearScore: i === 0 ? 100 : 90,
            explanation: buildFallbackExplanation(outfitItems, mood, shuffledTones[i] ?? 'warm'),
        };
    });
}

import {
    type ClothingItem,
    type FashionMood,
    type WeatherData,
    type OutfitSuggestion,
    ClothingCategory
} from "../../types/index";
import { v4 as uuidv4 } from 'uuid';
import { callBedrockConverseAPI } from "../bedrockClient";
import { getAgentFailureReason } from "./agentErrors";
import { createAgentTraceId, recordAgentMetric } from "./agentTelemetry";
import { mapStylistSuggestions, moodIdsForStyling, parseAgentJson, sanitizeUiCopy } from "./agentOutputGuards";

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
        const traceId = createAgentTraceId("stylist");

        // 1. Prepare Wardrobe JSON context (limit fields to save tokens)
        const wardrobeContext = clothes.map(c => ({
            id: c.id,
            category: c.category,
            subcategory: c.subcategory,
            color: c.color,
            season: c.season,
            userMoods: moodIdsForStyling(c),
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
            ? `\nBEHAVIORAL PRIORITY ITEMS (incorporate at least one of these across your 3 outfits; the user wants to wear these more):
${JSON.stringify(priorityItems)}
${tryItIds.length > 0 ? `USER "TRY IT" REQUESTS (highest priority; the user explicitly asked to wear these): ${JSON.stringify(tryItIds)}` : ''}`
            : '';

        // Prompt tailored to output clothing combinations and engaging commentary
        const prompt = `You are a high-end Personal Stylist Agent.
Your client needs logical and aesthetic outfit combinations that optimize their fashion style.

CONDITIONS:
- Current Weather: ${weather.temperature}° (Feels like ${weather.feelsLike}°), ${weather.condition}.
- Desired Mood/Vibe: ${mood.name} (${mood.description})
- ${profileContext}
${behavioralHint}
PRIORITIZE items whose "userMoods" array includes "${mood.id}" — these are items the user categorized for this vibe when adding them.
AVAILABLE WARDROBE (JSON format):
${JSON.stringify(wardrobeContext)}

TASK:
Create 3 different outfit combinations using ONLY the available items.
For each outfit, provide the IDs of the items used.
STRICT COMPOSITION RULES:
- REQUIRED: Exactly 1 bottoms item
- REQUIRED: At least 1 top-layer item from "tops" or "outerwear"
- OPTIONAL: Additional top layers (cardigans, jackets, jumpers, coats)
- NEVER include 2 bottoms in one outfit
- Do not include dresses in suggestions

Provide a brief explanation of why it works, and an engaging one-sentence comment for the user.
Output strictly as a JSON array of objects, with NO markdown formatting around it:
[
  {
    "itemIds": ["id1", "id2", "id3"],
    "moodName": "${mood.name}",
    "weatherMatch": 95,
    "wearScore": 90,
                    "explanation": "Write 2-3 sentences of self contained outfit copy with no label prefix. Reference the specific colors and item types actually in this outfit. Vary your tone freely across the 3 outfits: one can be punchy and hype, one poetic or editorial, one warm and encouraging. Do not use hyphen or dash characters. Close every explanation with a single sentence that makes the user genuinely excited to put it on."
  }
]`;

        try {
            const payload = {
                messages: [{ role: "user", content: [{ text: prompt }] }],
                inferenceConfig: { maxTokens: 1000, temperature: 0.75 },
            };

            const jsonStr = await callBedrockConverseAPI(payload, { agent: "stylist", traceId });
            const parsed = parseAgentJson(jsonStr, "stylist", traceId);
            const mapped = mapStylistSuggestions(parsed, clothes, mood, uuidv4);

            recordAgentMetric({
                agent: "stylist",
                traceId,
                phase: "validation",
                inputCount: clothes.length,
                outputCount: mapped.suggestions.length,
                invalidIdsDropped: mapped.invalidIdsDropped,
                invalidOutfitsDropped: mapped.invalidOutfitsDropped,
            });

            if (mapped.suggestions.length === 0) {
                throw new Error("No valid outfits with one-bottom rule.");
            }

            return mapped.suggestions;

        } catch (error) {
            console.error("[Stylist Agent] Failed to generate outfits, falling back to mock:", error);
            recordAgentMetric({
                agent: "stylist",
                traceId,
                phase: "fallback",
                reason: getAgentFailureReason(error),
            });
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
            return `${names}. This combo hits different. The colors lock in perfectly and the whole look screams ${moodName} without even trying. Step out and own it today.`;
        case 'editorial':
            return `There's a quiet confidence in pairing ${names}. Each piece earns its place, and together they speak the language of ${moodName} fluently. Consider this your look of the day.`;
        case 'warm':
        default:
            return `${names} makes for a look that feels just right, effortlessly ${moodName} and totally you. You're going to feel great in this one.`;
    }
}

function getMockOutfitSuggestions(clothes: ClothingItem[], mood: FashionMood): OutfitSuggestion[] {
    const moodId = mood.id;

    const filterByMood = (arr: ClothingItem[]) => {
        const matching = arr.filter(c => moodIdsForStyling(c).includes(moodId));
        return matching.length > 0 ? matching : arr;
    };

    const tops = clothes.filter(c => c.category === ClothingCategory.Tops);
    const bottoms = clothes.filter(c => c.category === ClothingCategory.Bottoms);
    const outerwear = clothes.filter(c => c.category === ClothingCategory.Outerwear);

    const prioritizedTops = filterByMood(tops);
    const prioritizedBottoms = filterByMood(bottoms);
    const prioritizedOuterwear = filterByMood(outerwear);
    const prioritizedTopLayers = [...prioritizedTops, ...prioritizedOuterwear];

    const getRandomItem = (arr: ClothingItem[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

    const createOutfit = () => {
        const items: ClothingItem[] = [];
        const top = getRandomItem(prioritizedTopLayers);
        const bottom = getRandomItem(prioritizedBottoms);
        if (top) items.push(top);
        if (bottom) items.push(bottom);

        // Optional second top-layer (never a second bottom)
        if (Math.random() > 0.5) {
            const secondLayer = getRandomItem(prioritizedOuterwear);
            if (secondLayer && !items.includes(secondLayer)) {
                items.unshift(secondLayer);
            }
        }
        return items;
    };

    const tones: Array<'hype' | 'editorial' | 'warm'> = ['hype', 'editorial', 'warm'];
    const shuffledTones = tones.sort(() => Math.random() - 0.5);

    return [0, 1, 2].map((i) => {
        const createdItems = createOutfit();
        const topLayers = createdItems.filter(item =>
            item.category === ClothingCategory.Tops || item.category === ClothingCategory.Outerwear
        );
        const bottom = createdItems.find(item => item.category === ClothingCategory.Bottoms);
        const outfitItems = bottom ? [...topLayers, bottom] : topLayers;

        return {
            id: uuidv4(),
            items: outfitItems,
            mood,
            weatherMatch: i === 0 ? 95 : i === 1 ? 90 : 86,
            wearScore: i === 0 ? 100 : i === 1 ? 94 : 88,
            explanation: sanitizeUiCopy(buildFallbackExplanation(outfitItems, mood, shuffledTones[i] ?? 'warm')),
        };
    }).filter(outfit =>
        outfit.items.some(item => item.category === ClothingCategory.Bottoms) &&
        outfit.items.some(item => item.category === ClothingCategory.Tops || item.category === ClothingCategory.Outerwear)
    );
}

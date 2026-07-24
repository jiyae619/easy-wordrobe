import {
    type ClothingItem,
    type FashionMood,
    type WeatherData,
    type OutfitSuggestion,
    ClothingCategory
} from "../../types/index";
import { v4 as uuidv4 } from 'uuid';
import { getTextProvider } from "../vision/providerRegistry";
import { getAgentFailureReason } from "./agentErrors";
import { createAgentTraceId, recordAgentMetric } from "./agentTelemetry";
import { clampSentences, computeWearScore, computeWeatherMatch, mapStylistSuggestions, moodIdsForStyling, parseAgentJson, sanitizeUiCopy } from "./agentOutputGuards";

export type BehavioralContext = {
    /** Items flagged by BehavioralAgent as unworn for 3+ weeks in the current season */
    leastWornItemIds: string[];
    /** Items the user explicitly tapped "Try it" on from the Insights page */
    tryItItemIds: string[];
    /** Items the user consistently skips — the Stylist should surface these less */
    deprioritizeItemIds?: string[];
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
        const deprioritizeIds = behavioralContext?.deprioritizeItemIds ?? [];
        // Priority = explicit "try it" (always wins) OR least-worn the user hasn't been skipping.
        const priorityIds = [...new Set([...tryItIds, ...leastWornIds])]
            .filter(id => tryItIds.includes(id) || !deprioritizeIds.includes(id));
        const priorityItems = wardrobeContext.filter(c => priorityIds.includes(c.id));
        // Avoid = repeatedly-skipped items, unless the user explicitly asked to try them.
        const avoidIds = deprioritizeIds.filter(id => !tryItIds.includes(id));

        const behavioralHint = priorityItems.length > 0
            ? `\nBEHAVIORAL PRIORITY ITEMS (incorporate at least one of these across your 3 outfits; the user wants to wear these more):
${JSON.stringify(priorityItems)}
${tryItIds.length > 0 ? `USER "TRY IT" REQUESTS (highest priority; the user explicitly asked to wear these): ${JSON.stringify(tryItIds)}` : ''}`
            : '';

        const avoidHint = avoidIds.length > 0
            ? `\nDEPRIORITIZE these item IDs (the user keeps skipping past them; use at most one across all 3 outfits, ideally none): ${JSON.stringify(avoidIds)}`
            : '';

        // Prompt tailored to output clothing combinations and engaging commentary
        const prompt = `You are a high-end Personal Stylist Agent.
Your client needs logical and aesthetic outfit combinations that optimize their fashion style.

CONDITIONS:
- Current Weather: ${weather.temperature}° (Feels like ${weather.feelsLike}°), ${weather.condition}.
- Desired Mood/Vibe: ${mood.name} (${mood.description})
- ${profileContext}
${behavioralHint}${avoidHint}
PRIORITIZE items whose "userMoods" array includes "${mood.id}" — these are items the user categorized for this vibe when adding them.
AVAILABLE WARDROBE (JSON format):
${JSON.stringify(wardrobeContext)}

TASK:
Create 3 different outfit combinations using ONLY the available items.
For each outfit, provide the IDs of the items used.
STRICT COMPOSITION RULES (each outfit must be ONE of these two shapes):
- Bottoms-based: EXACTLY 1 bottoms item AND at least 1 top layer from "tops" or "outerwear". Additional outerwear layers (cardigans, jackets, coats) are optional. NEVER include 2 bottoms.
- Dress-based: EXACTLY 1 dresses item, with optional outerwear. NEVER mix a dress with bottoms.
- OPTIONAL for either shape: add 0 or 1 "shoes" item to complete the look. Never add more than 1.

Provide a brief explanation of why it works, and an engaging one-sentence comment for the user.
Output strictly as a JSON array of objects, with NO markdown formatting around it:
[
  {
    "itemIds": ["id1", "id2", "id3"],
    "moodName": "${mood.name}",
    "weatherMatch": 95,
    "wearScore": 90,
                    "explanation": "Write AT MOST 2 short sentences of self contained outfit copy with no label prefix. Reference the specific colors and item types actually in this outfit. Vary your tone freely across the 3 outfits: one punchy and hype, one poetic or editorial, one warm and encouraging. Do not use hyphen or dash characters. Keep it tight — the final sentence should make the user genuinely excited to put it on."
  }
]`;

        try {
            const jsonStr = await getTextProvider().callText(
                { prompt, maxTokens: 1000, temperature: 0.75 },
                { agent: "stylist", traceId },
            );
            const parsed = parseAgentJson(jsonStr, "stylist", traceId);
            const mapped = mapStylistSuggestions(parsed, clothes, mood, uuidv4, weather.temperature);

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
            return getMockOutfitSuggestions(clothes, mood, weather);
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

function getMockOutfitSuggestions(clothes: ClothingItem[], mood: FashionMood, weather: WeatherData): OutfitSuggestion[] {
    const moodId = mood.id;

    const filterByMood = (arr: ClothingItem[]) => {
        const matching = arr.filter(c => moodIdsForStyling(c).includes(moodId));
        return matching.length > 0 ? matching : arr;
    };

    const tops = clothes.filter(c => c.category === ClothingCategory.Tops);
    const bottoms = clothes.filter(c => c.category === ClothingCategory.Bottoms);
    const outerwear = clothes.filter(c => c.category === ClothingCategory.Outerwear);
    const dresses = clothes.filter(c => c.category === ClothingCategory.Dresses);
    const shoes = clothes.filter(c => c.category === ClothingCategory.Shoes);

    const prioritizedTops = filterByMood(tops);
    const prioritizedBottoms = filterByMood(bottoms);
    const prioritizedOuterwear = filterByMood(outerwear);
    const prioritizedDresses = filterByMood(dresses);
    const prioritizedShoes = filterByMood(shoes);
    const prioritizedTopLayers = [...prioritizedTops, ...prioritizedOuterwear];

    const getRandomItem = (arr: ClothingItem[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

    const createOutfit = (): ClothingItem[] => {
        // Prefer a bottoms-based look; fall back to a dress-based look (mirrors the composition rules).
        if (prioritizedTopLayers.length > 0 && prioritizedBottoms.length > 0) {
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
            const shoe = getRandomItem(prioritizedShoes);
            if (shoe) items.push(shoe);
            return items;
        }

        const dress = getRandomItem(prioritizedDresses);
        if (dress) {
            const items: ClothingItem[] = [dress];
            if (Math.random() > 0.5) {
                const layer = getRandomItem(prioritizedOuterwear);
                if (layer) items.unshift(layer);
            }
            const shoe = getRandomItem(prioritizedShoes);
            if (shoe) items.push(shoe);
            return items;
        }
        return [];
    };

    const tones: Array<'hype' | 'editorial' | 'warm'> = ['hype', 'editorial', 'warm'];
    const shuffledTones = tones.sort(() => Math.random() - 0.5);

    return [0, 1, 2].map((i) => {
        const createdItems = createOutfit();
        const topLayers = createdItems.filter(item =>
            item.category === ClothingCategory.Tops || item.category === ClothingCategory.Outerwear
        );
        const bottom = createdItems.find(item => item.category === ClothingCategory.Bottoms);
        const dress = createdItems.find(item => item.category === ClothingCategory.Dresses);
        const shoe = createdItems.find(item => item.category === ClothingCategory.Shoes);
        const base = dress
            ? [...topLayers, dress]
            : bottom ? [...topLayers, bottom] : topLayers;
        const outfitItems = shoe ? [...base, shoe] : base;

        return {
            id: uuidv4(),
            items: outfitItems,
            mood,
            // Even fallback picks get real, computed scores — no fabricated numbers.
            weatherMatch: computeWeatherMatch(outfitItems, weather.temperature),
            wearScore: computeWearScore(outfitItems, clothes),
            explanation: clampSentences(sanitizeUiCopy(buildFallbackExplanation(outfitItems, mood, shuffledTones[i] ?? 'warm')), 2),
            isFallback: true,
        };
    }).filter(outfit =>
        outfit.items.some(item => item.category === ClothingCategory.Dresses) ||
        (outfit.items.some(item => item.category === ClothingCategory.Bottoms) &&
            outfit.items.some(item => item.category === ClothingCategory.Tops || item.category === ClothingCategory.Outerwear))
    );
}

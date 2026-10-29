import {
    type ClothingItem,
    type FashionMood,
    type WeatherData,
    type OutfitSuggestion,
} from "../../types/index";
import { v4 as uuidv4 } from 'uuid';
import { getTextProvider } from "../vision/providerRegistry";
import { getAgentFailureReason } from "./agentErrors";
import { createAgentTraceId, recordAgentMetric } from "./agentTelemetry";
import { StylistAliases, clampSentences, getCurrentSeason, computeWearScore, computeWeatherMatch, mapStylistSuggestions, parseAgentJson, sanitizeUiCopy } from "./agentOutputGuards";
import { assembleMoodLooks, computeMoodMatch, moodFitTier, selectMoodCandidates } from "./moodFit";
import { getMoodStyle } from "../../data/moodStyles";
import { itemName } from '../../utils/itemName';

const STYLIST_TIMEOUT_MS = 15_000;

export type BehavioralContext = {
    /** Items flagged by BehavioralAgent as unworn for 3+ weeks in the current season */
    leastWornItemIds: string[];
    /** Items the user explicitly tapped "Try it" on from the Insights page */
    tryItItemIds: string[];
    /** Items the user consistently skips — the Stylist should surface these less */
    deprioritizeItemIds?: string[];
};

/** The mood brief at the top of the prompt: what the mood means in garments, not just its name. */
function moodBrief(mood: FashionMood): string {
    const style = getMoodStyle(mood.id);
    if (!style) return `MOOD: ${mood.name}. ${mood.description}.`;
    return `MOOD: ${mood.name}. ${style.brief}
- Reach for: ${style.reachFor}.
- Shape and fabric: ${style.shape}.
- Colors: ${style.colors}.
- Breaks the mood: ${style.avoid}.`;
}

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
        weather: WeatherData | null,
        userProfile?: { gender?: string, height?: string, weight?: string },
        behavioralContext?: BehavioralContext
    ): Promise<OutfitSuggestion[]> => {
        console.log("[Stylist Agent] Generating outfits...");
        const traceId = createAgentTraceId("stylist");

        // 1. Mood fit first, in code: pieces that clash with the mood (a hoodie for Professional,
        // a blazer for Sporty) never reach the model, so they cannot end up in a look. Kept pieces
        // carry a "fit" label and come best-first. (moodFit.ts, rules in data/moodStyles.ts)
        const { items: candidates, fit } = selectMoodCandidates(clothes, mood.id);

        // 2. Wardrobe JSON with only the fields the model needs. Items go to the model under short
        // aliases ("i1", "i2", ...) instead of their 20-36 character ids: every id costs ~15-25
        // tokens on the way in AND on the way out, and output tokens are generated one by one, so
        // aliases cut both prompt size and generation time. Aliases are mapped back before validation.
        const aliases = new StylistAliases(candidates);
        const wardrobeContext = candidates.map(c => ({
            id: aliases.toAlias(c.id),
            category: c.category,
            subcategory: c.subcategory,
            color: c.color,
            season: c.season,
            fit: moodFitTier(fit.get(c.id) ?? 0.5),
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
        // Listed by alias only (details are in the wardrobe JSON). toAliases drops pieces that were
        // filtered out as off-mood: a "Wear more" hoodie waits for a mood it suits.
        const priorityAliases = aliases.toAliases(priorityIds);
        const tryItAliases = aliases.toAliases(tryItIds);
        // Avoid = repeatedly-skipped items, unless the user explicitly asked to try them.
        const avoidAliases = aliases.toAliases(deprioritizeIds.filter(id => !tryItIds.includes(id)));

        const priorityRule = priorityAliases.length > 0
            ? `4. Wear more: once 1 to 3 are satisfied, include at least one of ${JSON.stringify(priorityAliases)} across the 3 outfits (the user wants to wear these more).${tryItAliases.length > 0 ? ` ${JSON.stringify(tryItAliases)} were explicitly requested, so prefer those.` : ''}`
            : '4. Wear more: no extra priorities today.';
        const avoidRule = avoidAliases.length > 0
            ? `\n6. The user keeps skipping ${JSON.stringify(avoidAliases)}: use at most one of them across all 3 outfits, ideally none.`
            : '';
        const weatherLine = weather
            ? `Weather now: ${weather.temperature}°C (feels like ${weather.feelsLike}°C), ${weather.condition}.`
            : `Weather: unknown. Dress for a typical ${getCurrentSeason()} day and favor easy layers.`;

        // Mood leads the prompt and the ranking: it used to be a name in passing, ranked below the
        // wear-more priorities, so neglected pieces drowned it out.
        const prompt = `You are a personal stylist building today's outfits from the client's own closet.

${moodBrief(mood)}

${weatherLine}
${profileContext}

WARDROBE (JSON). "fit" is how well a piece suits ${mood.name}: "high" is textbook ${mood.name}, "ok" works next to high pieces. Pieces that clash with the mood were already removed.
${JSON.stringify(wardrobeContext)}

CHOOSE IN THIS ORDER OF IMPORTANCE:
1. Mood: every outfit must read as ${mood.name} at a glance. Anchor each outfit on at least one "high" piece and keep formality consistent inside an outfit (no gym pieces with tailoring, no evening pieces with athletic wear).
2. Weather: dress for the temperature and conditions (layer when cool, breathable when hot, closed shoes in rain).
3. Composition (strict). Each outfit is ONE of:
   - Bottoms-based: EXACTLY 1 "bottoms" item and at least 1 top layer from "tops" or "outerwear"; extra outerwear layers are optional. Never 2 bottoms.
   - Dress-based: EXACTLY 1 "dresses" item, optional outerwear. Never a dress with bottoms.
   - Either shape may add 0 or 1 "shoes" item.
${priorityRule}
5. Color: coordinate colors, guided by the mood's palette. Make the 3 outfits clearly different from each other.${avoidRule}

Output strictly a JSON array of 3 objects, no markdown:
[
  {
    "itemIds": ["i1", "i2", "i3"],
    "explanation": "AT MOST 2 short sentences of self contained outfit copy, no label prefix. Name the actual colors and item types and say what makes it ${mood.name}. Vary tone across the 3: one punchy and hype, one poetic or editorial, one warm and encouraging. No hyphen or dash characters. Under 20 words, plain everyday language, no slang. End on a line that makes the user excited to put it on."
  }
]`;

        try {
            const jsonStr = await getTextProvider().callText(
                { prompt, maxTokens: 1000, temperature: 0.75 },
                // Today waits on this call. A 15s cap with no retry after a timeout bounds the worst
                // case at ~15s before code-assembled picks show (was 30s + a 30s retry). Fast
                // failures (429 / 5xx) still get their one retry.
                { agent: "stylist", traceId, timeoutMs: STYLIST_TIMEOUT_MS, retryOnTimeout: false },
            );
            const parsed = aliases.resolveSuggestionIds(parseAgentJson(jsonStr, "stylist", traceId));
            // Validate against the candidates only: an id of a filtered-out (off-mood) piece is dropped.
            const mapped = mapStylistSuggestions(parsed, candidates, mood, uuidv4, weather?.temperature ?? null);

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

            // Wear score is measured against the whole closet; best mood match leads the stack.
            return mapped.suggestions
                .map((s) => ({ ...s, wearScore: computeWearScore(s.items, clothes), moodMatch: computeMoodMatch(s.items, mood.id) }))
                .sort((a, b) => b.moodMatch - a.moodMatch);

        } catch (error) {
            console.error("[Stylist Agent] Failed to generate outfits, falling back to code-assembled looks:", error);
            recordAgentMetric({
                agent: "stylist",
                traceId,
                phase: "fallback",
                reason: getAgentFailureReason(error),
            });
            return buildCodeLooks(clothes, mood, weather, behavioralContext, { variant: Math.floor(Math.random() * 1000) + 1 });
        }
    }
};

// ==========================================
// Code-assembled looks (fallback, and the instant preview while the AI works)
// ==========================================

type Tone = 'hype' | 'editorial' | 'warm';

function buildFallbackExplanation(items: ClothingItem[], mood: FashionMood, tone: Tone): string {
    const names = items.map(i => itemName(i)).join(', ');
    const moodName = mood.name.toLowerCase();
    switch (tone) {
        case 'hype':
            return `${names}. The colors click and it's pure ${moodName}. Go own the day.`;
        case 'editorial':
            return `${names}. Quiet, confident and very ${moodName}.`;
        case 'warm':
        default:
            return `${names}. Easy, ${moodName} and totally you.`;
    }
}

/**
 * Up to 3 looks assembled in code from mood fit, weather fit and wear priorities (moodFit.ts), with
 * real computed scores. Flagged isFallback. `variant` 0 is deterministic (stable preview); any other
 * value reshuffles near-ties so "Show me more" during an outage gives different looks.
 */
export function buildCodeLooks(
    clothes: ClothingItem[],
    mood: FashionMood,
    weather: WeatherData | null,
    behavioralContext?: BehavioralContext,
    options: { variant?: number } = {},
): OutfitSuggestion[] {
    const tryItIds = behavioralContext?.tryItItemIds ?? [];
    const temperatureC = weather?.temperature ?? null;
    const looks = assembleMoodLooks(clothes, mood.id, {
        temperatureC,
        priorityIds: [...tryItIds, ...(behavioralContext?.leastWornItemIds ?? [])],
        avoidIds: (behavioralContext?.deprioritizeItemIds ?? []).filter((id) => !tryItIds.includes(id)),
        variant: options.variant ?? 0,
    });
    const tones: Tone[] = ['hype', 'editorial', 'warm'];
    return looks.map((items, i) => ({
        id: options.variant ? uuidv4() : `code-${mood.id}-${items.map((item) => item.id).join('+')}`,
        items,
        mood,
        weatherMatch: computeWeatherMatch(items, temperatureC),
        wearScore: computeWearScore(items, clothes),
        moodMatch: computeMoodMatch(items, mood.id),
        explanation: clampSentences(sanitizeUiCopy(buildFallbackExplanation(items, mood, tones[(i + (options.variant ?? 0)) % 3])), 2),
        isFallback: true,
    }));
}

import {
    type ClothingItem,
    type WearRecord,
    type UserInsight,
    type Season,
} from "../../types/index";
import { callBedrockConverseAPI } from "../bedrockClient";

function getCurrentSeason(): Season {
    const month = new Date().getMonth() + 1; // 1–12
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "fall";
    return "winter";
}

function buildFallbackNudges(unwornItems: ClothingItem[]): string[] {
    const item = unwornItems[0];
    const itemLabel = item ? `your ${item.color} ${item.subcategory}` : 'something from the back of your closet';
    const item2 = unwornItems[1];
    const item2Label = item2 ? `that ${item2.color} ${item2.subcategory}` : 'another forgotten piece';

    const hypePools = [
        `${itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} is sitting there waiting. Stop scrolling, start wearing — today's the day.`,
        `Wake up. ${itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} has been benched for 3 weeks. Pull it out and remind everyone why you bought it.`,
        `You've got ${itemLabel} collecting dust. That's a crime against fashion. Fix it tomorrow.`,
    ];
    const wittyPools = [
        `You and ${item2Label} used to be so close... what happened? It misses you. Reach out.`,
        `Your wardrobe called — it says you keep picking the same three things. Time to branch out. ${item2Label} is raising its hand.`,
        `If your closet could talk, ${item2Label} would be filing a formal complaint right about now.`,
    ];
    const editorialPools = [
        `A wardrobe is only as interesting as its least-worn piece — the untold story is always the most compelling one.`,
        `The most stylish wardrobes are the most rotated ones. Every item deserves its moment in the light.`,
        `Fashion is a conversation between who you are and who you could be. Let the quieter pieces have a say.`,
    ];

    const pick = (pool: string[]) => pool[Math.floor(Math.random() * pool.length)];

    return [pick(hypePools), pick(wittyPools), pick(editorialPools)];
}

export const BehavioralAgent = {
    /**
     * Agent 3: Behavioral Insights
     * Analyzes wear history for insights, categorizes items by weather/mood,
     * suggests items unworn in 3 weeks under the same season, and provides engaging nudges.
     */
    generateInsights: async (
        clothes: ClothingItem[],
        wearHistory: WearRecord[]
    ): Promise<UserInsight> => {
        console.log("[Behavioral Agent] Generating insights from wear history...");

        const currentSeason = getCurrentSeason();

        // 1. Filter history to the last 21 days (3 weeks)
        const threeWeeksAgo = new Date();
        threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

        // Ensure dates are parsed correctly if they come from Firestore as strings/timestamps
        const recentHistory = wearHistory.filter(record => {
            const recordDate = record.date instanceof Date ? record.date : new Date(record.date);
            return recordDate >= threeWeeksAgo;
        });

        // 2. Prepare Context (limit fields to save tokens)
        const wardrobeContext = clothes.map(c => ({
            id: c.id,
            category: c.category,
            subcategory: c.subcategory,
            color: c.color,
            season: c.season,
            lastWorn: c.lastWorn,
            wearFrequency: c.wearFrequency
        }));

        const historyContext = recentHistory.map(h => ({
            date: h.date,
            itemIds: h.outfitItems,
            mood: h.mood,
            weather: {
                temp: h.weather.temperature,
                condition: h.weather.condition
            }
        }));

        // Pre-filter: only wardrobe items suitable for the current season
        const seasonalWardrobeContext = wardrobeContext.filter(c =>
            (c.season as string[]).includes(currentSeason)
        );

        // 3. Construct the Prompt
        const prompt = `You are an engaging, and kind Behavioral Fashion Analyst Agent.
Your client wants insights into their wearing habits and nudges to diversify their outfits!

CURRENT SEASON: ${currentSeason}

WARDROBE — items suitable for ${currentSeason} (JSON):
${JSON.stringify(seasonalWardrobeContext)}

WEAR HISTORY (Last 21 Days / 3 Weeks) (JSON):
${JSON.stringify(historyContext)}

TASKS:
1. Analyze the wear history to find the most worn colors and most worn items.
2. Group and categorize their wearing patterns based on weather and mood.
3. Identify items from the seasonal wardrobe that have NOT been worn at all in the last 3 weeks. These are the priority items to suggest. Only include items whose "season" array contains "${currentSeason}".
4. Write exactly 3 behavioral nudges, each in a distinctly different voice:
   - Nudge 1: A fired-up hype coach — short, punchy, motivating. Reference a specific unworn item by color and type.
   - Nudge 2: A witty best friend — playful, a little teasing, warm. Call out a wear pattern you spotted (e.g. always the same color, always on rainy days).
   - Nudge 3: A thoughtful fashion editor — one elegant, inspiring sentence about what the wardrobe could become with more variety.
   Each nudge must feel genuinely different in tone. Do NOT use generic phrases like "great job" or "you've been rocking". Be specific and surprising.
5. Calculate their daily wear pattern (how many outfits recorded per day of the week, e.g., Mon, Tue).

OUTPUT STRICTLY AS JSON:
{
  "mostWornColors": [{"color": "Name", "hex": "#Hex", "count": 5}],
  "mostWornItemIds": [{"id": "item_id", "count": 3}],
  "leastWornItemIds": ["item_id_1", "item_id_2"],
  "suggestedVariations": ["Nudge 1", "Nudge 2", "Nudge 3"],
  "weeklyWearPattern": [{"day": "Mon", "count": 2}, {"day": "Tue", "count": 1}]
}
Return NO markdown outside of the JSON object.`;

        try {
            const payload = {
                messages: [{ role: "user", content: [{ text: prompt }] }],
                inferenceConfig: { maxTokens: 1000, temperature: 0.85 },
            };

            const jsonStr = await callBedrockConverseAPI(payload);
            const aiInsights = JSON.parse(jsonStr);

            // 4. Map back to TypeScript interfaces
            const mostWornItemsMap = (aiInsights.mostWornItemIds || []).map((meta: { id: string, count: number }) => {
                const item = clothes.find(c => c.id === meta.id);
                return item ? { item, count: meta.count } : null;
            }).filter(Boolean);

            const leastWornItemsMap = (aiInsights.leastWornItemIds || []).map((id: string) => {
                return clothes.find(c => c.id === id);
            }).filter(Boolean);

            // Fallback: if AI failed to find least worn, dynamically compute it
            // Only include items suitable for the current season and unworn in the last 3 weeks
            let finalLeastWorn = leastWornItemsMap;
            if (finalLeastWorn.length === 0) {
                const wornIds = new Set(recentHistory.flatMap(h => h.outfitItems));
                finalLeastWorn = clothes
                    .filter(c => !wornIds.has(c.id) && c.season.includes(currentSeason))
                    .slice(0, 5);
            }

            return {
                mostWornColors: aiInsights.mostWornColors || [],
                mostWornItems: mostWornItemsMap,
                leastWornItems: finalLeastWorn,
                suggestedVariations: aiInsights.suggestedVariations?.length
                    ? aiInsights.suggestedVariations
                    : buildFallbackNudges(finalLeastWorn as ClothingItem[]),
                weeklyWearPattern: aiInsights.weeklyWearPattern || [
                    { day: "Mon", count: 0 }, { day: "Tue", count: 0 }, { day: "Wed", count: 0 },
                    { day: "Thu", count: 0 }, { day: "Fri", count: 0 }, { day: "Sat", count: 0 }, { day: "Sun", count: 0 }
                ]
            };

        } catch (error) {
            console.error("[Behavioral Agent] Insights generation failed, falling back to mock:", error);
            // Dynamic Mock Fallback — same-season, 3-week unworn filter
            const wornIds = new Set(recentHistory.flatMap(h => h.outfitItems));
            const leastWornItems = clothes
                .filter(c => !wornIds.has(c.id) && c.season.includes(currentSeason))
                .slice(0, 3);

            const finalItems = leastWornItems.length > 0 ? leastWornItems : clothes.slice(0, 2);

            return {
                mostWornColors: [
                    { color: "Black", hex: "#000000", count: 15 },
                    { color: "White", hex: "#FFFFFF", count: 12 }
                ],
                mostWornItems: [],
                leastWornItems: finalItems,
                suggestedVariations: buildFallbackNudges(finalItems),
                weeklyWearPattern: [
                    { day: "Mon", count: 2 }, { day: "Tue", count: 1 }, { day: "Wed", count: 3 },
                    { day: "Thu", count: 2 }, { day: "Fri", count: 4 }, { day: "Sat", count: 5 }, { day: "Sun", count: 1 }
                ]
            };
        }
    }
};

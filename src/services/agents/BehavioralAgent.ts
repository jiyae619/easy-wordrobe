import {
    type ClothingItem,
    type WearRecord,
    type UserInsight
} from "../../types/index";
import { callBedrockConverseAPI } from "../bedrockClient";

export const BehavioralAgent = {
    /**
     * Agent 3: Behavioral Insights
     * Analyzes wear history for insights, categorizes items by weather/mood,
     * suggests items unworn in 2 weeks, and provides engaging nudges.
     */
    generateInsights: async (
        clothes: ClothingItem[],
        wearHistory: WearRecord[]
    ): Promise<UserInsight> => {
        console.log("[Behavioral Agent] Generating insights from wear history...");

        // 1. Filter history to the last 14 days to save tokens and focus on recent patterns
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        // Ensure dates are parsed correctly if they come from Firestore as strings/timestamps
        const recentHistory = wearHistory.filter(record => {
            const recordDate = record.date instanceof Date ? record.date : new Date(record.date);
            return recordDate >= twoWeeksAgo;
        });

        // 2. Prepare Context (limit fields to save tokens)
        const wardrobeContext = clothes.map(c => ({
            id: c.id,
            category: c.category,
            subcategory: c.subcategory,
            color: c.color,
            season: c.season,
            aiTags: c.aiTags,
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

        // 3. Construct the Prompt
        const prompt = `You are a fun, engaging, and kind Behavioral Fashion Analyst Agent.
Your client wants insights into their wearing habits and nudges to diversify their outfits!

WARDROBE (JSON):
${JSON.stringify(wardrobeContext)}

WEAR HISTORY (Last 14 Days) (JSON):
${JSON.stringify(historyContext)}

TASKS:
1. Analyze the wear history to find the most worn colors and most worn items.
2. Group and categorize their wearing patterns based on weather and mood.
3. Identify items in their wardrobe that have NOT been worn in the last 2 weeks.
4. Write 3 fun, engaging, and kind behavioral nudges. These nudges should explicitly mention the connections between their weather/mood habits, and encourage them to wear their unworn items. Let your personality shine!
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
                inferenceConfig: { maxTokens: 1000, temperature: 0.7 },
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
            let finalLeastWorn = leastWornItemsMap;
            if (finalLeastWorn.length === 0) {
                const wornIds = new Set(recentHistory.flatMap(h => h.outfitItems));
                finalLeastWorn = clothes.filter(c => !wornIds.has(c.id)).slice(0, 5);
            }

            return {
                mostWornColors: aiInsights.mostWornColors || [],
                mostWornItems: mostWornItemsMap,
                leastWornItems: finalLeastWorn,
                suggestedVariations: aiInsights.suggestedVariations || [
                    "You've been rocking those comfy vibes, but let's try something new tomorrow!"
                ],
                weeklyWearPattern: aiInsights.weeklyWearPattern || [
                    { day: "Mon", count: 0 }, { day: "Tue", count: 0 }, { day: "Wed", count: 0 },
                    { day: "Thu", count: 0 }, { day: "Fri", count: 0 }, { day: "Sat", count: 0 }, { day: "Sun", count: 0 }
                ]
            };

        } catch (error) {
            console.error("[Behavioral Agent] Insights generation failed, falling back to mock:", error);
            // Dynamic Mock Fallback
            const wornIds = new Set(recentHistory.flatMap(h => h.outfitItems));
            const leastWornItems = clothes.filter(c => !wornIds.has(c.id)).slice(0, 3);

            return {
                mostWornColors: [
                    { color: "Black", hex: "#000000", count: 15 },
                    { color: "White", hex: "#FFFFFF", count: 12 }
                ],
                mostWornItems: [],
                leastWornItems: leastWornItems.length > 0 ? leastWornItems : clothes.slice(0, 2),
                suggestedVariations: [
                    "You wear a lot of dark colors on rainy days! Try adding a pop of yellow next time it drizzles ☔️",
                    "Your vintage denim jacket hasn't seen the light of day in 2 weeks! It's begging for a sunny afternoon.",
                    "Great job rotating your shoes this month! Let's keep that variety going into the weekend 🎉"
                ],
                weeklyWearPattern: [
                    { day: "Mon", count: 2 }, { day: "Tue", count: 1 }, { day: "Wed", count: 3 },
                    { day: "Thu", count: 2 }, { day: "Fri", count: 4 }, { day: "Sat", count: 5 }, { day: "Sun", count: 1 }
                ]
            };
        }
    }
};

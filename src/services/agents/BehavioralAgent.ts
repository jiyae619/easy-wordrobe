import {
    type ClothingItem,
    type WearRecord,
    type UserInsight,
} from "../../types/index";
import { getTextProvider } from "../vision/providerRegistry";
import { getAgentFailureReason } from "./agentErrors";
import { createAgentTraceId, recordAgentMetric } from "./agentTelemetry";
import {
    computeBehavioralAnalytics,
    getCurrentSeason,
    isRecord,
    parseAgentJson,
    sanitizeUiCopy,
} from "./agentOutputGuards";

function buildFallbackNudges(unwornItems: ClothingItem[]): string[] {
    const item = unwornItems[0];
    const itemLabel = item ? `your ${item.color} ${item.subcategory}` : 'something from the back of your closet';
    const item2 = unwornItems[1];
    const item2Label = item2 ? `that ${item2.color} ${item2.subcategory}` : 'another forgotten piece';

    const hypePools = [
        `${itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} is sitting there waiting. Stop scrolling, start wearing, today is the day.`,
        `Wake up. ${itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1)} has been benched for 3 weeks. Pull it out and remind everyone why you bought it.`,
        `You've got ${itemLabel} collecting dust. That's a crime against fashion. Fix it tomorrow.`,
    ];
    const wittyPools = [
        `You and ${item2Label} used to be so close... what happened? It misses you. Reach out.`,
        `Your wardrobe called, it says you keep picking the same three things. Time to branch out. ${item2Label} is raising its hand.`,
        `If your closet could talk, ${item2Label} would be filing a formal complaint right about now.`,
    ];
    const editorialPools = [
        `A wardrobe is only as interesting as its least worn piece, and the untold story is always the most compelling one.`,
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
        const traceId = createAgentTraceId("behavioral");

        const currentSeason = getCurrentSeason();

        // 1. Last 21 days (3 weeks) of wear history.
        const threeWeeksAgo = new Date();
        threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
        const recentHistory = wearHistory.filter(record => {
            const recordDate = record.date instanceof Date ? record.date : new Date(record.date);
            return recordDate >= threeWeeksAgo;
        });

        // 2. ALL counting/ranking is done deterministically in code — never by the model.
        //    Tallying counts at temperature 0.85 would be a correctness risk; arithmetic is code's job.
        //    The LLM's ONLY job below is to write 3 nudges on top of these numbers, which is the
        //    real justification for running this agent hot (0.85) — it's copy, not analysis.
        const analytics = computeBehavioralAnalytics(clothes, recentHistory, currentSeason);

        const fallbackInsight = (): UserInsight => ({
            ...analytics,
            suggestedVariations: buildFallbackNudges(analytics.leastWornItems).map(sanitizeUiCopy),
        });

        // 3. Facts handed to the model so it can be specific without recomputing anything.
        const leastWornFacts = analytics.leastWornItems.map(i => ({ color: i.color, type: i.subcategory }));
        const topColors = analytics.mostWornColors.map(c => `${c.color} (${c.count})`).join(", ") || "none yet";
        const busiestDays = [...analytics.weeklyWearPattern]
            .filter(d => d.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 2)
            .map(d => `${d.day} (${d.count})`)
            .join(", ") || "no clear pattern yet";

        // Nothing neglected to nudge about → skip the model call entirely.
        if (leastWornFacts.length === 0) {
            recordAgentMetric({ agent: "behavioral", traceId, phase: "validation", inputCount: clothes.length, outputCount: 0 });
            return fallbackInsight();
        }

        // 4. Construct the Prompt — copy generation ONLY, no analysis.
        const prompt = `You are an engaging, kind Behavioral Fashion Analyst.
The wear analysis is ALREADY DONE for you below. Do NOT recompute or invent any numbers.
Your only job is to write 3 short, warm outfit nudges using these facts.

CURRENT SEASON: ${currentSeason}
LEAST-WORN ITEMS (unworn in the last 3 weeks — reference these by color and type):
${JSON.stringify(leastWornFacts)}
MOST-WORN COLORS: ${topColors}
BUSIEST DAYS: ${busiestDays}

Write exactly 3 nudges, each in a distinctly different voice:
- Nudge 1: a fired up hype coach, short and punchy. Name a specific least-worn item by color and type.
- Nudge 2: a witty best friend, playful and teasing. Tease one wear pattern (e.g. always the same color, always the same day).
- Nudge 3: a thoughtful fashion editor, one elegant sentence about what the wardrobe could become with more variety.
Be specific and surprising. No generic praise like "great job". Do not use hyphen or dash characters.

OUTPUT STRICTLY AS JSON, no markdown:
{ "suggestedVariations": ["Nudge 1", "Nudge 2", "Nudge 3"] }`;

        try {
            // Temp 0.85 is for the COPY only — every count above is computed in code.
            const jsonStr = await getTextProvider().callText(
                { prompt, maxTokens: 512, temperature: 0.85 },
                { agent: "behavioral", traceId },
            );
            const parsed = parseAgentJson(jsonStr, "behavioral", traceId);
            const rawNudges = Array.isArray(parsed)
                ? parsed
                : isRecord(parsed) && Array.isArray(parsed.suggestedVariations)
                    ? parsed.suggestedVariations
                    : [];
            const nudges = rawNudges
                .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
                .map(sanitizeUiCopy)
                .slice(0, 3);

            const suggestedVariations = nudges.length > 0
                ? nudges
                : buildFallbackNudges(analytics.leastWornItems).map(sanitizeUiCopy);

            recordAgentMetric({
                agent: "behavioral",
                traceId,
                phase: "validation",
                inputCount: clothes.length,
                outputCount: suggestedVariations.length,
            });

            return { ...analytics, suggestedVariations };

        } catch (error) {
            console.error("[Behavioral Agent] Nudge generation failed, using fallback copy:", error);
            recordAgentMetric({
                agent: "behavioral",
                traceId,
                phase: "fallback",
                reason: getAgentFailureReason(error),
            });
            return fallbackInsight();
        }
    }
};

import { type WeatherData, type WeatherOutlookPeriod } from "../../types";
import { callBedrockConverseAPI } from "../bedrockClient";

export const WeatherAgent = {
    generateWeatherCheer: async (
        weather: WeatherData,
        outlook: WeatherOutlookPeriod[]
    ): Promise<string> => {
        const prompt = `You are a warm fashion weather companion.
Generate one short cheer up sentence for the user's home screen based on current weather and today's outlook.

CURRENT:
- ${weather.temperature}°C, ${weather.condition}
- Location: ${weather.location}

OUTLOOK:
${outlook.map((p) => `- ${p.label}: ${p.temperature}°C, ${p.condition}`).join('\n')}

RULES:
- Output JSON only: {"cheerLine":"..."}
- Keep it to one sentence, max 20 words.
- Tone must vary naturally each time (for example cozy, playful, motivational, poetic).
- Mention weather feel implicitly (warm, chilly, rainy, breezy), not exact numbers.
- Do not use hyphen or dash characters in the final sentence.
- Avoid hashtags, emojis, and exclamation overuse.
`;

        try {
            const payload = {
                messages: [{ role: "user", content: [{ text: prompt }] }],
                inferenceConfig: { maxTokens: 120, temperature: 0.85 },
            };

            const jsonStr = await callBedrockConverseAPI(payload);
            const parsed = JSON.parse(jsonStr) as { cheerLine?: string };
            return (parsed.cheerLine || "").trim().replace(/[—–-]/g, ' ').replace(/\s+/g, ' ').trim();
        } catch (error) {
            console.error("[Weather Agent] Failed to generate cheer line:", error);
            return "";
        }
    }
};

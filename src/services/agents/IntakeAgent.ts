import {
    type ClothingItem,
    ClothingCategory,
    Season,
} from "../../types/index";
import { v4 as uuidv4 } from 'uuid';
import { callBedrockConverseAPI } from "../bedrockClient";

export const IntakeAgent = {
    /**
     * Agent 1: Intake Specialist
     * Analyzes clothing images to extract metadata (category, color, season, mood).
     */
    analyzeClothingImage: async (imageBase64: string): Promise<ClothingItem> => {
        console.log("[Intake Agent] Analyzing clothing image...");

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

        const prompt = `You are a fashion AI assistant who optimizes the current fashion items from the wardrobe while also meeting the fashion trend based on the mood and current weather. Refer to the fashion guide tailored to the height and weight, gender from Pinterest or other fashion guidelines. Analyze this clothing item image and return ONLY a JSON object with these fields:
{
  "category": one of "tops", "bottoms", "outerwear", "dresses", "shoes", "accessories", "bags",
  "subcategory": specific type like "Crew Neck T-Shirt", "Denim Jeans", "Running Shoes", etc.,
  "color": the primary color name like "Navy Blue", "Forest Green", "Cream",
  "colorHex": the hex code for the primary color like "#1B2A4A",
  "pattern": one of "solid", "striped", "plaid", "floral", "graphic", "abstract", "animal print", "polka dot",
  "season": array of suitable seasons from ["spring", "summer", "fall", "winter"],
  "mood": array of 1-3 matching moods from ["professional", "casual", "sporty", "creative", "minimalist", "cozy", "elegant", "streetwear", "romantic"]
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
                    temperature: 0.3,
                },
            };

            const jsonStr = await callBedrockConverseAPI(payload);
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
                aiTags: Array.isArray(parsed.mood) ? parsed.mood : [],
                userNotes: "",
            };
        } catch (error) {
            console.error("[Intake Agent] Analysis failed, falling back to mock:", error);
            // Fallback mock
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
    }
};

import {
    type ClothingItem,
    ClothingCategory,
    Season,
} from "../../types/index";
import { v4 as uuidv4 } from 'uuid';
import { callBedrockConverseAPI } from "../bedrockClient";

// Valid moods coherent across all agents and pages (from src/data/moods.ts)
const VALID_MOODS = [
    "professional",
    "casual",
    "sporty",
    "creative",
    "romantic"
] as const;

export type DetectedClothingItem = ClothingItem;

export type IntakeResult = {
    success: true;
    items: DetectedClothingItem[];
} | {
    success: false;
    error: "RESTRICTED_CONTENT";
    message: string;
};

export const IntakeAgent = {
    /**
     * Agent 1: Intake Specialist
     * Analyzes clothing images to extract metadata for up to 3 detected items.
     * Includes safety guardrails for inappropriate content.
     */
    analyzeClothingImage: async (imageBase64: string): Promise<IntakeResult> => {
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

        const prompt = `You are a fashion AI assistant analyzing clothing items for a digital wardrobe app.

SAFETY CHECK (IMPORTANT):
First, check if the image contains any inappropriate content:
- Nudity or partial nudity
- Sexually suggestive content
- Violent or disturbing imagery
- Any content not suitable for a general audience

If the image contains inappropriate content, return ONLY:
[{"isRestricted": true}]

If the image is safe, identify up to 3 distinct clothing items visible in the image and return a JSON ARRAY. Each element must match this exact structure:

[
  {
    "isRestricted": false,
    "category": "tops",
    "subcategory": "Crew Neck T-Shirt",
    "color": "Navy Blue",
    "colorHex": "#1B2A4A",
    "season": ["spring", "summer"],
    "mood": ["casual"],
    "hasNoisyBackground": false
  }
]

FIELD RULES:
- "category": must be exactly one of: "tops", "bottoms", "outerwear", "dresses"
- "subcategory": a specific descriptive label, e.g. "Slim-Fit Chinos", "Oversized Hoodie", "Wrap Dress"
- "color": the dominant color name in plain English, e.g. "Olive Green", "Cream", "Burgundy"
- "colorHex": a valid 6-digit hex code matching the color, e.g. "#6B7C45"
- "season": a JSON array containing one or more of: "spring", "summer", "fall", "winter"
- "mood": a JSON array with 1–3 values from: "professional", "casual", "sporty", "creative", "romantic"
- "hasNoisyBackground": true if the background is cluttered or distracting, otherwise false

IMPORTANT:
- Analyze clothing items ONLY — do NOT include shoes, bags, hats, or accessories
- If only one item is visible, still return a single-element array
- Order items by how prominent or central they are in the image
- Return ONLY the raw JSON array — no markdown fences, no explanation, no extra text`;

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
                    maxTokens: 1024,
                    temperature: 0.2,
                },
            };

            const jsonStr = await callBedrockConverseAPI(payload);
            const parsed: any[] = JSON.parse(jsonStr);

            // Safety check — if any item is restricted, reject the whole image
            if (!Array.isArray(parsed) || parsed.some(p => p.isRestricted === true)) {
                console.warn("[Intake Agent] Restricted content detected");
                return {
                    success: false,
                    error: "RESTRICTED_CONTENT",
                    message: "This image is restricted due to safety concerns. Please try another image."
                };
            }

            const validCategories = Object.values(ClothingCategory);
            const validSeasons = Object.values(Season);

            const items: DetectedClothingItem[] = parsed.map((p: any) => {
                const category = validCategories.includes(p.category)
                    ? p.category
                    : ClothingCategory.Tops;

                const season = Array.isArray(p.season)
                    ? p.season.filter((s: string) => validSeasons.includes(s as Season))
                    : [Season.Spring];

                const moods = Array.isArray(p.mood)
                    ? p.mood.filter((m: string) => VALID_MOODS.includes(m as typeof VALID_MOODS[number]))
                    : ["casual"];

                return {
                    id: uuidv4(),
                    imageUrl: imageBase64,
                    category,
                    subcategory: p.subcategory || "Unknown",
                    color: p.color || "Unknown",
                    colorHex: p.colorHex || "#000000",
                    season: season.length > 0 ? season : [Season.Spring],
                    wearFrequency: 0,
                    lastWorn: null,
                    dateAdded: new Date(),
                    aiTags: moods,
                    userNotes: p.hasNoisyBackground ? "Consider retaking with a plain background" : "",
                };
            });

            return { success: true, items };
        } catch (error) {
            console.error("[Intake Agent] Analysis failed, falling back to mock:", error);
            const fallbackItem: DetectedClothingItem = {
                id: uuidv4(),
                imageUrl: imageBase64,
                category: ClothingCategory.Tops,
                subcategory: "Casual T-Shirt",
                color: "Navy Blue",
                colorHex: "#1a1a2e",
                season: [Season.Spring, Season.Summer],
                wearFrequency: 0,
                lastWorn: null,
                dateAdded: new Date(),
                aiTags: ["casual"],
                userNotes: "",
            };
            return { success: true, items: [fallbackItem] };
        }
    }
};

import {
    type ClothingItem,
    ClothingCategory,
} from "../../types/index";
import { v4 as uuidv4 } from 'uuid';
import { callBedrockConverseAPI } from "../bedrockClient";
import { AgentError, getAgentFailureReason } from "./agentErrors";
import { createAgentTraceId, recordAgentMetric } from "./agentTelemetry";
import { mapIntakeItem, normalizeIntakeResponse, parseAgentJson } from "./agentOutputGuards";

export type DetectedClothingItem = ClothingItem;

export type IntakeResult = {
    success: true;
    items: DetectedClothingItem[];
    /** True when analysis failed and a placeholder item was returned */
    usedFallback?: boolean;
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
        const traceId = createAgentTraceId("intake");

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
    "hasNoisyBackground": false,
    "bbox": { "x": 0.2, "y": 0.1, "width": 0.5, "height": 0.75 },
    "confidence": 0.91
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
- "bbox": normalized location of the item in the image with x,y,width,height in range 0..1
- "confidence": confidence for the detection in range 0..1

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

            const jsonStr = await callBedrockConverseAPI(payload, { agent: "intake", traceId });
            const parsed = parseAgentJson(jsonStr, "intake", traceId);
            const normalized = normalizeIntakeResponse(parsed);

            if (normalized.status === "restricted") {
                console.warn("[Intake Agent] Restricted content detected");
                recordAgentMetric({
                    agent: "intake",
                    traceId,
                    phase: "validation",
                    reason: "unsafe_content",
                });
                return {
                    success: false,
                    error: "RESTRICTED_CONTENT",
                    message: "This image is restricted due to safety concerns. Please try another image."
                };
            }

            if (normalized.status === "invalid") {
                throw new AgentError("intake", "schema_invalid", normalized.message, { traceId });
            }

            const items: DetectedClothingItem[] = normalized.items.map((item) =>
                mapIntakeItem(item, imageBase64, uuidv4)
            );

            recordAgentMetric({
                agent: "intake",
                traceId,
                phase: "parse_success",
                inputCount: normalized.items.length,
                outputCount: items.length,
            });

            return { success: true, items };
        } catch (error) {
            console.error("[Intake Agent] Analysis failed, falling back to placeholder:", error);
            recordAgentMetric({
                agent: "intake",
                traceId,
                phase: "fallback",
                reason: getAgentFailureReason(error),
            });
            const fallbackItem: DetectedClothingItem = {
                id: uuidv4(),
                imageUrl: imageBase64,
                sourceImageUrl: imageBase64,
                category: ClothingCategory.Tops,
                subcategory: "Unknown",
                color: "Unknown",
                colorHex: "#808080",
                season: [],
                wearFrequency: 0,
                lastWorn: null,
                dateAdded: new Date(),
                aiTags: [],
                userMoods: [],
                userNotes: "",
                detectionConfidence: 0,
            };
            return { success: true, items: [fallbackItem], usedFallback: true };
        }
    }
};

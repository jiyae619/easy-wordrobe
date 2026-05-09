import { describe, expect, it } from "vitest";
import { ClothingCategory, Season, type ClothingItem, type FashionMood, type WearRecord } from "../../../types";
import { extractJsonFromText } from "../../bedrockClient";
import {
    mapIntakeItem,
    mapStylistSuggestions,
    normalizeBehavioralInsights,
    normalizeIntakeResponse,
} from "../agentOutputGuards";

const mood: FashionMood = {
    id: "casual",
    name: "Casual",
    description: "Relaxed and easy",
    colorPalette: ["#000000"],
    previewImageUrl: "",
    tags: ["casual"],
};

const item = (
    id: string,
    category: ClothingItem["category"],
    season: ClothingItem["season"] = [Season.Spring],
    color = "Black"
): ClothingItem => ({
    id,
    imageUrl: "",
    category,
    subcategory: `${color} ${category}`,
    color,
    colorHex: "#111111",
    season,
    wearFrequency: 0,
    lastWorn: null,
    dateAdded: new Date("2026-01-01T00:00:00Z"),
    aiTags: ["casual"],
    userMoods: ["casual"],
});

describe("agent response contracts", () => {
    it("does not treat a single safe intake object as restricted content", () => {
        const normalized = normalizeIntakeResponse({
            isRestricted: false,
            category: "tops",
            subcategory: "Tee",
            color: "Black",
            colorHex: "#111111",
            season: ["spring"],
            mood: ["casual"],
        });

        expect(normalized.status).toBe("items");
        if (normalized.status === "items") {
            expect(normalized.items).toHaveLength(1);
        }
    });

    it("only marks intake restricted from an explicit restriction signal", () => {
        expect(normalizeIntakeResponse({ isRestricted: true }).status).toBe("restricted");
        expect(normalizeIntakeResponse("not json payload").status).toBe("invalid");
    });

    it("maps intake moods into both aiTags and userMoods", () => {
        const mapped = mapIntakeItem(
            {
                category: "tops",
                subcategory: "Crew Tee",
                color: "Black",
                colorHex: "#111111",
                season: ["spring"],
                mood: ["casual", "not-a-real-mood"],
            },
            "data:image/jpeg;base64,abc",
            () => "item-1"
        );

        expect(mapped.aiTags).toEqual(["casual"]);
        expect(mapped.userMoods).toEqual(["casual"]);
    });

    it("extracts JSON from fenced or prose wrapped Bedrock text", () => {
        expect(extractJsonFromText("```json\n[{\"ok\":true}]\n```")).toBe("[{\"ok\":true}]");
        expect(extractJsonFromText("Here you go: {\"ok\":true} thanks")).toBe("{\"ok\":true}");
    });
});

describe("stylist validity gates", () => {
    const wardrobe = [
        item("top-1", ClothingCategory.Tops),
        item("jacket-1", ClothingCategory.Outerwear),
        item("bottom-1", ClothingCategory.Bottoms),
        item("bottom-2", ClothingCategory.Bottoms),
        item("dress-1", ClothingCategory.Dresses),
    ];

    it("delivers exactly one bottom and at least one top layer", () => {
        const result = mapStylistSuggestions(
            [
                {
                    itemIds: ["top-1", "bottom-1", "bottom-2", "jacket-1", "dress-1", "missing-id"],
                    weatherMatch: 101,
                    wearScore: -4,
                    explanation: "A sharp fit.",
                },
            ],
            wardrobe,
            mood,
            () => "outfit-1"
        );

        expect(result.invalidIdsDropped).toBe(1);
        expect(result.suggestions).toHaveLength(1);
        const categories = result.suggestions[0].items.map((entry) => entry.category);
        expect(categories.filter((category) => category === ClothingCategory.Bottoms)).toHaveLength(1);
        expect(categories.some((category) => category === ClothingCategory.Tops || category === ClothingCategory.Outerwear)).toBe(true);
        expect(categories).not.toContain(ClothingCategory.Dresses);
        expect(result.suggestions[0].weatherMatch).toBe(100);
        expect(result.suggestions[0].wearScore).toBe(0);
    });

    it("drops outfits that cannot meet top plus bottom requirements", () => {
        const result = mapStylistSuggestions(
            [{ itemIds: ["bottom-1", "bottom-2"] }],
            wardrobe,
            mood,
            () => "outfit-1"
        );

        expect(result.suggestions).toHaveLength(0);
        expect(result.invalidOutfitsDropped).toBe(1);
    });
});

describe("behavioral integrity gates", () => {
    const springTop = item("spring-top", ClothingCategory.Tops, [Season.Spring], "Blue");
    const springBottom = item("spring-bottom", ClothingCategory.Bottoms, [Season.Spring], "Black");
    const winterTop = item("winter-top", ClothingCategory.Tops, [Season.Winter], "White");
    const wardrobe = [springTop, springBottom, winterTop];
    const recentHistory: WearRecord[] = [
        {
            id: "wear-1",
            date: new Date("2026-05-04T12:00:00Z"),
            outfitItems: ["spring-top"],
            mood: "casual",
            weather: {
                temperature: 65,
                feelsLike: 65,
                condition: "Cloudy",
                humidity: 60,
                windSpeed: 5,
                location: "SF",
            },
        },
    ];

    it("keeps least-worn items valid, seasonal, and unworn", () => {
        const result = normalizeBehavioralInsights(
            {
                mostWornColors: [{ color: "Blue", hex: "bad-hex", count: 1 }],
                mostWornItemIds: [{ id: "spring-top", count: 1 }, { id: "missing", count: 3 }],
                leastWornItemIds: ["spring-top", "winter-top", "missing", "spring-bottom"],
                suggestedVariations: ["Try the black bottoms today."],
                weeklyWearPattern: [{ day: "Fake", count: 8 }, { day: "Mon", count: 1 }],
            },
            wardrobe,
            recentHistory,
            Season.Spring,
            () => ["Fallback one", "Fallback two", "Fallback three"]
        );

        expect(result.insight.leastWornItems.map((entry) => entry.id)).toEqual(["spring-bottom"]);
        expect(result.insight.mostWornItems.map((entry) => entry.item.id)).toEqual(["spring-top"]);
        expect(result.insight.mostWornColors[0].hex).toBe("#808080");
        expect(result.insight.weeklyWearPattern).toHaveLength(7);
        expect(result.invalidIdsDropped).toBeGreaterThanOrEqual(3);
    });
});

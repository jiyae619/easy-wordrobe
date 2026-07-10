import { describe, expect, it } from "vitest";
import { ClothingCategory, Season, type ClothingItem, type FashionMood, type OutfitSuggestion, type SuggestionEvent, type WearRecord } from "../../../types";
import { extractJsonFromText } from "../../bedrockClient";
import {
    computeDeprioritizedItemIds,
    computeLeastWornItems,
    computeWearStreak,
    describeOutfitReason,
    getWardrobeReadiness,
    mapIntakeItem,
    mapStylistSuggestions,
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

    it("delivers exactly one bottom and at least one top layer, preferring top+bottom over a dress", () => {
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
            () => "outfit-1",
            20 // spring-mild temperature; every item is a spring item
        );

        expect(result.invalidIdsDropped).toBe(1);
        expect(result.suggestions).toHaveLength(1);
        const categories = result.suggestions[0].items.map((entry) => entry.category);
        expect(categories.filter((category) => category === ClothingCategory.Bottoms)).toHaveLength(1);
        expect(categories.some((category) => category === ClothingCategory.Tops || category === ClothingCategory.Outerwear)).toBe(true);
        // A valid top+bottom outfit exists, so the dress is not mixed in.
        expect(categories).not.toContain(ClothingCategory.Dresses);
        // Scores are computed from real data (all spring items, all unworn) — not the model's 101/-4.
        expect(result.suggestions[0].weatherMatch).toBe(100);
        expect(result.suggestions[0].wearScore).toBe(100);
    });

    it("drops outfits that cannot meet top plus bottom or dress requirements", () => {
        const result = mapStylistSuggestions(
            [{ itemIds: ["bottom-1", "bottom-2"] }],
            wardrobe,
            mood,
            () => "outfit-1",
            20
        );

        expect(result.suggestions).toHaveLength(0);
        expect(result.invalidOutfitsDropped).toBe(1);
    });

    it("accepts a dress-based outfit when no top+bottom pairing is possible", () => {
        const dressWardrobe = [
            item("dress-1", ClothingCategory.Dresses, [Season.Summer]),
            item("coat-1", ClothingCategory.Outerwear, [Season.Summer]),
        ];
        const result = mapStylistSuggestions(
            [{ itemIds: ["dress-1", "coat-1"] }],
            dressWardrobe,
            mood,
            () => "outfit-1",
            30
        );

        expect(result.suggestions).toHaveLength(1);
        const categories = result.suggestions[0].items.map((entry) => entry.category);
        expect(categories).toContain(ClothingCategory.Dresses);
        expect(categories).not.toContain(ClothingCategory.Bottoms);
    });

    it("adds an optional single shoes item to complete either shape", () => {
        const wardrobeWithShoes = [
            item("top-1", ClothingCategory.Tops, [Season.Spring]),
            item("bottom-1", ClothingCategory.Bottoms, [Season.Spring]),
            item("shoe-1", ClothingCategory.Shoes, [Season.Spring]),
        ];
        const result = mapStylistSuggestions(
            [{ itemIds: ["top-1", "bottom-1", "shoe-1"] }],
            wardrobeWithShoes,
            mood,
            () => "outfit-1",
            20,
        );

        expect(result.suggestions).toHaveLength(1);
        const categories = result.suggestions[0].items.map((entry) => entry.category);
        expect(categories).toContain(ClothingCategory.Shoes);
        // Shoes are additive, not a replacement — the top+bottom base is intact.
        expect(categories.filter((c) => c === ClothingCategory.Shoes)).toHaveLength(1);
        expect(categories.filter((c) => c === ClothingCategory.Bottoms)).toHaveLength(1);
    });
});

describe("deterministic outfit scoring", () => {
    it("computes weather match from item seasons, ignoring the model's number", () => {
        const summerWardrobe = [
            item("top-1", ClothingCategory.Tops, [Season.Summer]),
            item("bottom-1", ClothingCategory.Bottoms, [Season.Summer]),
        ];

        const hot = mapStylistSuggestions(
            [{ itemIds: ["top-1", "bottom-1"], weatherMatch: 3 }],
            summerWardrobe, mood, () => "o", 30 // summer temperature — both items suit it
        );
        expect(hot.suggestions[0].weatherMatch).toBe(100);

        const cold = mapStylistSuggestions(
            [{ itemIds: ["top-1", "bottom-1"], weatherMatch: 99 }],
            summerWardrobe, mood, () => "o", 0 // winter temperature — neither item suits it
        );
        expect(cold.suggestions[0].weatherMatch).toBe(50);
    });

    it("scores less-worn outfits higher on rotation", () => {
        const worn = item("worn-top", ClothingCategory.Tops, [Season.Summer]);
        worn.wearFrequency = 10;
        const fresh = item("fresh-top", ClothingCategory.Tops, [Season.Summer]);
        const bottom = item("bottom", ClothingCategory.Bottoms, [Season.Summer]);
        const wardrobe = [worn, fresh, bottom];

        const wornOutfit = mapStylistSuggestions([{ itemIds: ["worn-top", "bottom"] }], wardrobe, mood, () => "o", 30);
        const freshOutfit = mapStylistSuggestions([{ itemIds: ["fresh-top", "bottom"] }], wardrobe, mood, () => "o", 30);

        expect(freshOutfit.suggestions[0].wearScore).toBeGreaterThan(wornOutfit.suggestions[0].wearScore);
    });
});

describe("least-worn grace period", () => {
    it("excludes items added within the last 3 weeks so new wardrobes are not falsely nudged", () => {
        const owned = item("owned", ClothingCategory.Tops, [Season.Spring]); // dateAdded 2026-01-01 (old)
        const justAdded = item("just-added", ClothingCategory.Tops, [Season.Spring]);
        justAdded.dateAdded = new Date();

        const leastWorn = computeLeastWornItems([owned, justAdded], [], Season.Spring, 5).map((entry) => entry.id);

        expect(leastWorn).toContain("owned");
        expect(leastWorn).not.toContain("just-added");
    });
});

describe("wardrobe readiness", () => {
    it("flags a bottom as missing when the wardrobe is only tops", () => {
        const r = getWardrobeReadiness([item("t1", ClothingCategory.Tops)]);
        expect(r.canMakeOutfit).toBe(false);
        expect(r.missingForOutfit).toContain("a bottom");
    });

    it("is ready with a top and a bottom", () => {
        const r = getWardrobeReadiness([
            item("t1", ClothingCategory.Tops),
            item("b1", ClothingCategory.Bottoms),
        ]);
        expect(r.canMakeOutfit).toBe(true);
        expect(r.missingForOutfit).toHaveLength(0);
    });

    it("is ready with a single dress", () => {
        const r = getWardrobeReadiness([item("d1", ClothingCategory.Dresses)]);
        expect(r.canMakeOutfit).toBe(true);
    });

    it("lists both pieces missing for an empty or shoes-only wardrobe", () => {
        const r = getWardrobeReadiness([item("s1", ClothingCategory.Shoes)]);
        expect(r.canMakeOutfit).toBe(false);
        expect(r.missingForOutfit).toEqual(["a top or jacket", "a bottom"]);
    });
});

describe("rejection signal", () => {
    const skipEvents = (itemIds: string[], times: number): SuggestionEvent[] =>
        Array.from({ length: times }, (_, i) => ({
            id: `${itemIds.join('')}-${i}`,
            action: 'skipped',
            itemIds,
            mood: 'casual',
            date: new Date('2026-06-01T00:00:00Z'),
        }));

    it("deprioritizes an item skipped 3+ times that has never been worn", () => {
        const neglected = item("skipped-top", ClothingCategory.Tops); // wearFrequency 0
        const result = computeDeprioritizedItemIds(skipEvents(["skipped-top"], 3), [neglected]);
        expect(result).toContain("skipped-top");
    });

    it("never deprioritizes an item the user actually wears, even if often skipped", () => {
        const worn = item("worn-top", ClothingCategory.Tops);
        worn.wearFrequency = 4;
        const result = computeDeprioritizedItemIds(skipEvents(["worn-top"], 5), [worn]);
        expect(result).not.toContain("worn-top");
    });

    it("ignores items skipped fewer than 3 times", () => {
        const twice = item("twice", ClothingCategory.Tops);
        const result = computeDeprioritizedItemIds(skipEvents(["twice"], 2), [twice]);
        expect(result).toHaveLength(0);
    });
});

describe("outfit reason attribution", () => {
    const blueTop = item("blue-top", ClothingCategory.Tops, [Season.Spring], "Navy Blue");
    const bottom = item("bottom", ClothingCategory.Bottoms, [Season.Spring], "Black");
    const suggestion: OutfitSuggestion = {
        id: "o1", items: [blueTop, bottom], mood, weatherMatch: 90, wearScore: 90, explanation: "",
    };

    it("attributes a 'try it' item ahead of everything else", () => {
        const reason = describeOutfitReason(
            suggestion,
            { tryItItemIds: ["blue-top"], leastWornItemIds: ["bottom"] },
            { temperature: 20, condition: "Sunny" },
        );
        expect(reason).toContain("wanted to try");
        expect(reason?.toLowerCase()).toContain("navy blue");
    });

    it("falls back to least-worn, then weather, then null", () => {
        expect(
            describeOutfitReason(suggestion, { tryItItemIds: [], leastWornItemIds: ["bottom"] }, { temperature: 20, condition: "Sunny" }),
        ).toContain("back into rotation");

        expect(
            describeOutfitReason(suggestion, { tryItItemIds: [], leastWornItemIds: [] }, { temperature: 18, condition: "Cloudy" }),
        ).toContain("18°");

        expect(
            describeOutfitReason(suggestion, { tryItItemIds: [], leastWornItemIds: [] }),
        ).toBeNull();
    });
});

describe("wear streak", () => {
    const weather = { temperature: 20, feelsLike: 20, condition: "Sunny", humidity: 50, windSpeed: 5, location: "SF" };
    const wearOn = (daysAgo: number): WearRecord => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return { id: `w-${daysAgo}`, date, outfitItems: [], mood: "casual", weather };
    };

    it("counts consecutive days including today", () => {
        const result = computeWearStreak([wearOn(0), wearOn(1), wearOn(2)]);
        expect(result.current).toBe(3);
        expect(result.loggedToday).toBe(true);
    });

    it("stays alive when today isn't logged yet but yesterday is", () => {
        const result = computeWearStreak([wearOn(1), wearOn(2)]);
        expect(result.current).toBe(2);
        expect(result.loggedToday).toBe(false);
    });

    it("breaks after a gap", () => {
        const result = computeWearStreak([wearOn(3), wearOn(4)]);
        expect(result.current).toBe(0);
    });
});

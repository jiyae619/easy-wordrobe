import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ClothingCategory, Season, type ClothingItem, type FashionMood, type OutfitSuggestion, type SuggestionEvent, type WearRecord } from "../../../types";
import { COLOR_PALETTE } from "../../../data/colorPalette";
import { STARTER_CATALOG, buildCatalogItem, buildStarterDeck, catalogImageUrl } from "../../../data/starterCatalog";
import { extractJsonFromText } from "../../bedrockClient";
import {
    VALID_MOODS,
    computeDeprioritizedItemIds,
    computeLeastWornItems,
    computeWearStreak,
    describeOutfitReason,
    getCurrentSeason,
    getWardrobeCompleteness,
    getWardrobeReadiness,
    mapIntakeItem,
    mapStylistSuggestions,
    normalizeIntakeResponse,
    setSeasonLatitude,
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

describe("wardrobe completeness meter", () => {
    it("nudges toward the first outfit when the closet is empty", () => {
        const c = getWardrobeCompleteness([]);
        expect(c.ratio).toBe(0);
        expect(c.nextUnlock).toContain("first outfit");
    });

    it("advances to a variety nudge once an outfit is possible but the closet is thin", () => {
        const c = getWardrobeCompleteness([
            item("t1", ClothingCategory.Tops),
            item("b1", ClothingCategory.Bottoms),
        ]);
        // canMakeOutfit milestone met, but not the 5+ item milestone.
        expect(c.ratio).toBeGreaterThan(0);
        expect(c.nextUnlock).toMatch(/variety/i);
    });

    it("reports no further unlock once the closet is full and has shoes", () => {
        const clothes = [
            ...Array.from({ length: 6 }, (_, i) => item(`t${i}`, ClothingCategory.Tops)),
            item("b1", ClothingCategory.Bottoms),
            item("s1", ClothingCategory.Shoes),
        ];
        const c = getWardrobeCompleteness(clothes);
        expect(c.ratio).toBe(1);
        expect(c.nextUnlock).toBeNull();
    });
});

describe("hemisphere-aware seasons", () => {
    const opposite: Record<Season, Season> = {
        [Season.Spring]: Season.Fall,
        [Season.Summer]: Season.Winter,
        [Season.Fall]: Season.Spring,
        [Season.Winter]: Season.Summer,
    };

    it("flips the season for southern-hemisphere latitudes and leaves northern unchanged", () => {
        setSeasonLatitude(40.7); // New York — northern
        const north = getCurrentSeason();
        setSeasonLatitude(-33.8); // Sydney — southern
        const south = getCurrentSeason();
        setSeasonLatitude(40.7); // restore northern so later tests see the default mapping
        expect(south).toBe(opposite[north]);
        expect(south).not.toBe(north);
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

// The starter catalog is the intake-BYPASS path: its items skip the vision model entirely, so this
// suite holds it to the same vocabulary the intake guards enforce — plus asset existence, since a
// catalog card with a broken image is a broken onboarding.
describe("starter catalog integrity", () => {
    const paletteNames = new Set(COLOR_PALETTE.map((c) => c.name));
    const validSeasons = new Set(Object.values(Season));
    const validCategories = new Set(Object.values(ClothingCategory));

    it("every entry stays inside the app's enums and palette vocabulary", () => {
        for (const entry of STARTER_CATALOG) {
            expect(validCategories.has(entry.category), `${entry.slug} category`).toBe(true);
            expect(entry.season.length, `${entry.slug} seasons`).toBeGreaterThan(0);
            entry.season.forEach((s) => expect(validSeasons.has(s), `${entry.slug} season ${s}`).toBe(true));
            expect(entry.moods.length, `${entry.slug} moods`).toBeGreaterThan(0);
            entry.moods.forEach((m) =>
                expect(VALID_MOODS.includes(m as typeof VALID_MOODS[number]), `${entry.slug} mood ${m}`).toBe(true));
            entry.colors.forEach((c) => expect(paletteNames.has(c), `${entry.slug} color ${c}`).toBe(true));
        }
    });

    it("ships a real image asset for every card color variant", () => {
        for (const entry of STARTER_CATALOG) {
            for (const color of entry.colors) {
                const assetPath = join(process.cwd(), "public", catalogImageUrl(entry, color));
                expect(existsSync(assetPath), `missing asset: ${assetPath}`).toBe(true);
            }
        }
    });

    it("keeps categories contiguous in deck order — the segmented progress bar depends on it", () => {
        const seen = new Set<string>();
        let prev: string | null = null;
        for (const entry of STARTER_CATALOG) {
            if (entry.category !== prev) {
                expect(seen.has(entry.category), `category ${entry.category} appears in two separate groups`).toBe(false);
                seen.add(entry.category);
                prev = entry.category;
            }
        }
    });

    it("guarantees a stylable outfit from the first card of the Tops and Bottoms groups", () => {
        const firstTop = STARTER_CATALOG.find((e) => e.category === ClothingCategory.Tops);
        const firstBottom = STARTER_CATALOG.find((e) => e.category === ClothingCategory.Bottoms);
        expect(firstTop && firstBottom).toBeTruthy();
        const picks = [firstTop!, firstBottom!].map((entry, i) => ({
            ...buildCatalogItem(entry),
            id: `pick-${i}`,
            dateAdded: new Date(),
        })) as ClothingItem[];
        expect(getWardrobeReadiness(picks).canMakeOutfit).toBe(true);
    });

    it("builds a category-filtered deck for deep-links and dedupes owned colors", () => {
        // Deep-link filter: only bottoms cards come back.
        const bottomsOnly = buildStarterDeck([], [ClothingCategory.Bottoms]);
        expect(bottomsOnly.length).toBeGreaterThan(0);
        bottomsOnly.forEach((card) => expect(card.entry.category).toBe(ClothingCategory.Bottoms));

        // Dedupe: owning the default-color tee removes that color but keeps the card's other colors.
        const tee = STARTER_CATALOG.find((e) => e.slug === "tops-crew-tee")!;
        const owned = { ...buildCatalogItem(tee), id: "own-1", dateAdded: new Date() } as ClothingItem;
        const deck = buildStarterDeck([owned]);
        const teeCard = deck.find((c) => c.entry.slug === "tops-crew-tee");
        expect(teeCard).toBeDefined();
        expect(teeCard!.colors).not.toContain(tee.colors[0]);
        expect(teeCard!.colors.length).toBe(tee.colors.length - 1);
    });

    it("materializes palette-exact color name/hex pairs (3.12 contract)", () => {
        const pairs = new Set(COLOR_PALETTE.map((c) => `${c.name}:${c.hex}`));
        for (const entry of STARTER_CATALOG) {
            for (const color of entry.colors) {
                const built = buildCatalogItem(entry, color);
                expect(pairs.has(`${built.color}:${built.colorHex}`), `${entry.slug} ${color}`).toBe(true);
                expect(built.aiColor, `${entry.slug} must not fake an AI detection`).toBeUndefined();
            }
        }
    });
});

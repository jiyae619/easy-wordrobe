import { describe, expect, it } from "vitest";
import { ClothingCategory, Season, type ClothingItem } from "../../../types";
import { MOODS, isMoodId, moodLabel, resolveMoodId } from "../../../data/moods";
import { MOOD_STYLES } from "../../../data/moodStyles";
import { VALID_MOODS, normalizeMoodIds } from "../agentOutputGuards";
import { buildCodeLooks } from "../StylistAgent";
import { OFF_MOOD_THRESHOLD, assembleMoodLooks, computeMoodMatch, itemMoodFit, moodFitTier, selectMoodCandidates } from "../moodFit";

const ALL = [Season.Spring, Season.Summer, Season.Fall, Season.Winter];

const piece = (
    id: string,
    category: ClothingCategory,
    subcategory: string,
    color = "Black",
    moods: string[] = [],
    season: Season[] = ALL,
): ClothingItem => ({
    id, imageUrl: "", category, subcategory, color, colorHex: "#111111", season,
    wearFrequency: 0, lastWorn: null, dateAdded: new Date("2026-01-01T00:00:00Z"),
    aiTags: [...moods], userMoods: [...moods],
});

// A mixed closet, tagged the way the starter catalog / intake tags things.
const closet = [
    piece("hoodie", ClothingCategory.Tops, "Oversized Hoodie", "Grey", ["casual", "sporty"]),
    piece("tee", ClothingCategory.Tops, "Crew Neck T-Shirt", "White", ["casual"]),
    piece("oxford", ClothingCategory.Tops, "Button-Down Shirt", "White", ["professional", "casual"]),
    piece("blouse", ClothingCategory.Tops, "Silk Blouse", "Pink", ["professional", "romantic"]),
    piece("joggers", ClothingCategory.Bottoms, "Fleece Joggers", "Black", ["sporty"]),
    piece("jeans", ClothingCategory.Bottoms, "Slim Jeans", "Blue", ["casual"]),
    piece("trousers", ClothingCategory.Bottoms, "Tailored Trousers", "Navy", ["professional"]),
    piece("skirt", ClothingCategory.Bottoms, "Pleated Midi Skirt", "Cream", ["romantic"]),
    piece("blazer", ClothingCategory.Outerwear, "Blazer", "Navy", ["professional"]),
    piece("puffer", ClothingCategory.Outerwear, "Puffer Parka", "Black", ["casual", "sporty"]),
    piece("wrap", ClothingCategory.Dresses, "Wrap Dress", "Pink", ["romantic"]),
    piece("sneakers", ClothingCategory.Shoes, "Running Sneakers", "White", ["sporty"]),
    piece("loafers", ClothingCategory.Shoes, "Penny Loafers", "Brown", ["professional"]),
];
const byId = (id: string) => closet.find((c) => c.id === id)!;
const fit = (id: string, mood: string) => itemMoodFit(byId(id), mood);

describe("creative mood is retired", () => {
    it("is gone from the selectable moods, the intake vocabulary and the style rules", () => {
        expect(MOODS.map((m) => m.id)).not.toContain("creative");
        expect(VALID_MOODS).not.toContain("creative");
        expect(Object.keys(MOOD_STYLES).sort()).toEqual(MOODS.map((m) => m.id).sort());
    });

    it("stored 'creative' tags and selections degrade gracefully", () => {
        expect(normalizeMoodIds(["creative", "casual"])).toEqual(["casual"]);
        expect(isMoodId("creative")).toBe(false);
        expect(isMoodId("occasion")).toBe(true);
        // Past wear records keep a readable name.
        expect(moodLabel("creative")).toBe("Creative");
        expect(moodLabel("sporty")).toBe("Sporty");
        // An item still tagged creative scores like an untagged one, without throwing.
        const legacy = piece("legacy", ClothingCategory.Tops, "Graphic Tee", "Red", ["creative"]);
        expect(itemMoodFit(legacy, "casual")).toBeGreaterThanOrEqual(OFF_MOOD_THRESHOLD);
    });
});

describe("Romantic → Special day", () => {
    it("maps stored romantic selections, links and item tags to occasion", () => {
        expect(MOODS.find((m) => m.id === "occasion")?.name).toBe("Special day");
        expect(isMoodId("romantic")).toBe(false);
        expect(resolveMoodId("romantic")).toBe("occasion");
        expect(resolveMoodId("sporty")).toBeUndefined();
        expect(normalizeMoodIds(["romantic", "casual"])).toEqual(["occasion", "casual"]);
        expect(moodLabel("romantic")).toBe("Romantic");
    });
});

describe("item mood fit (curated rules)", () => {
    it("keeps clashing garment types out of a mood even when the user tagged them nearby", () => {
        expect(moodFitTier(fit("hoodie", "professional"))).toBe("off");
        expect(moodFitTier(fit("joggers", "professional"))).toBe("off");
        expect(moodFitTier(fit("puffer", "occasion"))).toBe("off");
        expect(moodFitTier(fit("hoodie", "occasion"))).toBe("off");
        expect(moodFitTier(fit("sneakers", "occasion"))).toBe("off");
    });

    it("rates textbook pieces high", () => {
        expect(moodFitTier(fit("blazer", "professional"))).toBe("high");
        expect(moodFitTier(fit("trousers", "professional"))).toBe("high");
        expect(moodFitTier(fit("hoodie", "casual"))).toBe("high");
        expect(moodFitTier(fit("wrap", "occasion"))).toBe("high");
        expect(moodFitTier(fit("skirt", "occasion"))).toBe("high");
        // Special day is for everyone: tailoring and dress shoes count too.
        expect(moodFitTier(fit("blazer", "occasion"))).toBe("high");
        expect(moodFitTier(fit("loafers", "occasion"))).toBe("high");
        expect(moodFitTier(fit("jeans", "casual"))).toBe("high");
    });

    it("does not read a t-shirt as a dress shirt", () => {
        expect(fit("tee", "professional")).toBeLessThan(fit("oxford", "professional"));
    });

    it("scores an outfit by its pieces' mean fit", () => {
        const office = computeMoodMatch([byId("blazer"), byId("oxford"), byId("trousers")], "professional");
        const gym = computeMoodMatch([byId("hoodie"), byId("joggers")], "professional");
        expect(office).toBeGreaterThan(80);
        expect(gym).toBeLessThan(20);
    });
});

describe("mood candidates for the Stylist prompt", () => {
    it("drops off-mood pieces", () => {
        const ids = selectMoodCandidates(closet, "professional").items.map((c) => c.id);
        expect(ids).toEqual(expect.arrayContaining(["blazer", "oxford", "trousers", "loafers"]));
        expect(ids).not.toContain("hoodie");
        expect(ids).not.toContain("joggers");
    });

    it("still leaves enough to dress a one-note closet", () => {
        const gymOnly = [closet[0], closet[4], closet[11]]; // hoodie, joggers, sneakers
        const ids = selectMoodCandidates(gymOnly, "professional").items.map((c) => c.id);
        expect(ids).toEqual(expect.arrayContaining(["hoodie", "joggers"]));
    });
});

describe("code-assembled mood looks (fallback and preview)", () => {
    const isValid = (look: ClothingItem[]) => {
        const count = (cat: ClothingCategory) => look.filter((i) => i.category === cat).length;
        const topLayers = count(ClothingCategory.Tops) + count(ClothingCategory.Outerwear);
        const bottomsShape = count(ClothingCategory.Bottoms) === 1 && topLayers >= 1 && count(ClothingCategory.Dresses) === 0;
        const dressShape = count(ClothingCategory.Dresses) === 1 && count(ClothingCategory.Bottoms) === 0 && count(ClothingCategory.Tops) === 0;
        return (bottomsShape || dressShape) && count(ClothingCategory.Shoes) <= 1;
    };

    it("builds valid, distinct, on-mood looks", () => {
        for (const mood of MOODS) {
            const looks = assembleMoodLooks(closet, mood.id, { temperatureC: 20 });
            expect(looks.length).toBeGreaterThan(0);
            looks.forEach((look) => expect(isValid(look)).toBe(true));
            const signatures = new Set(looks.map((l) => l.map((i) => i.id).sort().join("+")));
            expect(signatures.size).toBe(looks.length);
            // Best look first and clearly on-mood; later looks may lean on "ok" pieces in a small closet.
            expect(computeMoodMatch(looks[0], mood.id)).toBeGreaterThanOrEqual(70);
            looks.forEach((look) => expect(computeMoodMatch(look, mood.id)).toBeGreaterThanOrEqual(40));
        }
    });

    it("dresses Professional in tailoring, not gym clothes", () => {
        const ids = assembleMoodLooks(closet, "professional", { temperatureC: 20 }).flat().map((i) => i.id);
        expect(ids).not.toContain("hoodie");
        expect(ids).not.toContain("joggers");
        expect(ids).not.toContain("sneakers");
        expect(ids).toContain("trousers");
    });

    it("puts athleisure (retired Sporty) under Casual", () => {
        expect(MOODS.map((m) => m.id)).not.toContain("sporty");
        expect(VALID_MOODS).not.toContain("sporty");
        expect(isMoodId("sporty")).toBe(false);
        expect(normalizeMoodIds(["sporty", "casual"])).toEqual(["casual"]);
        // Joggers tagged only "sporty" still work for Casual, and never for Professional.
        expect(moodFitTier(fit("joggers", "casual"))).not.toBe("off");
        expect(moodFitTier(fit("joggers", "professional"))).toBe("off");
    });

    it("adds an outer layer when it is cool and works with no weather at all", () => {
        const cold = assembleMoodLooks(closet, "casual", { temperatureC: 4 });
        expect(cold.some((look) => look.some((i) => i.category === ClothingCategory.Outerwear))).toBe(true);
        expect(assembleMoodLooks(closet, "casual", { temperatureC: null }).length).toBeGreaterThan(0);
    });

    it("is stable for variant 0 so the instant preview does not reshuffle", () => {
        const a = assembleMoodLooks(closet, "occasion", { temperatureC: 18 }).map((l) => l.map((i) => i.id));
        const b = assembleMoodLooks(closet, "occasion", { temperatureC: 18 }).map((l) => l.map((i) => i.id));
        expect(a).toEqual(b);
    });
});

describe("instant preview looks (buildCodeLooks)", () => {
    const casual = MOODS.find((m) => m.id === "casual")!;

    it("are flagged, scored, stable across renders and work without weather", () => {
        const a = buildCodeLooks(closet, casual, null);
        const b = buildCodeLooks(closet, casual, null);
        expect(a.length).toBeGreaterThan(0);
        expect(a.map((l) => l.id)).toEqual(b.map((l) => l.id));
        a.forEach((look) => {
            expect(look.isFallback).toBe(true);
            expect(look.moodMatch).toBeGreaterThan(0);
            expect(look.weatherMatch).toBeGreaterThanOrEqual(50);
        });
    });
});

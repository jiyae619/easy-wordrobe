import { describe, expect, it } from "vitest";
import { ClothingCategory, Season, type ClothingItem, type WeatherData } from "../../../types";
import { MOODS } from "../../../data/moods";
import { computeWeatherMatch } from "../agentOutputGuards";
import { buildCodeLooks } from "../StylistAgent";
import { selectMoodCandidates } from "../moodFit";
import { OFF_WEATHER_THRESHOLD, applyWeatherNeeds, isWeatherproofOuter, itemWeatherFit, readWeather } from "../weatherFit";
import { STARTER_CATALOG, buildCatalogItem } from "../../../data/starterCatalog";
import { weatherCacheBucket } from "../../../hooks/useStylistLooks";

const ALL = [Season.Spring, Season.Summer, Season.Fall, Season.Winter];

const piece = (id: string, category: ClothingCategory, subcategory: string, moods: string[] = ["casual"]): ClothingItem => ({
    id, imageUrl: "", category, subcategory, color: "Black", colorHex: "#111111", season: ALL,
    wearFrequency: 0, lastWorn: null, dateAdded: new Date("2026-01-01T00:00:00Z"),
    aiTags: [...moods], userMoods: [...moods],
});

const weather = (temperature: number, condition: string, extra: Partial<WeatherData> = {}): WeatherData => ({
    temperature, feelsLike: temperature, condition, humidity: 80, windSpeed: 10, location: "Seattle, WA", ...extra,
});

const closet = [
    piece("tee", ClothingCategory.Tops, "Crew Neck T-Shirt"),
    piece("oxford", ClothingCategory.Tops, "Button Down Shirt"),
    piece("sweater", ClothingCategory.Tops, "Wool Knit Sweater"),
    piece("cardigan", ClothingCategory.Tops, "Chunky Cardigan"),
    piece("jeans", ClothingCategory.Bottoms, "Slim Jeans"),
    piece("chinos", ClothingCategory.Bottoms, "Chinos"),
    piece("shorts", ClothingCategory.Bottoms, "Linen Shorts"),
    piece("leather", ClothingCategory.Outerwear, "Leather Biker Jacket"),
    piece("raincoat", ClothingCategory.Outerwear, "Waterproof Rain Jacket"),
    piece("puffer", ClothingCategory.Outerwear, "Puffer Jacket"),
    piece("sundress", ClothingCategory.Dresses, "Sundress"),
    piece("sneakers", ClothingCategory.Shoes, "Canvas Sneakers"),
    piece("suede", ClothingCategory.Shoes, "Suede Loafers"),
    piece("boots", ClothingCategory.Shoes, "Rain Boots"),
    piece("sandals", ClothingCategory.Shoes, "Strappy Sandals"),
];
const byId = (id: string) => closet.find((c) => c.id === id)!;
const casual = MOODS.find((m) => m.id === "casual")!;

describe("readWeather", () => {
    it("reads the band from feels-like, and rain, snow and wind from the reading", () => {
        expect(readWeather(weather(9, "Light Rain"))).toMatchObject({ band: "cool", wet: true, snow: false, windy: false });
        expect(readWeather(weather(8, "Cloudy", { feelsLike: 4 }))?.band).toBe("cold");
        expect(readWeather(weather(-1, "Snow Showers"))).toMatchObject({ band: "cold", wet: true, snow: true });
        expect(readWeather(weather(14, "Mostly Cloudy", { windSpeed: 38 }))?.windy).toBe(true);
        expect(readWeather(weather(29, "Sunny"))?.band).toBe("hot");
        expect(readWeather(null)).toBeNull();
    });
});

describe("itemWeatherFit", () => {
    const rain = readWeather(weather(9, "Rain"));
    const fit = (id: string, c = rain) => itemWeatherFit(byId(id), c);

    it("rain rules out leather, suede, canvas and open shoes", () => {
        for (const id of ["leather", "suede", "sneakers", "sandals"]) {
            expect(fit(id), id).toBeLessThan(OFF_WEATHER_THRESHOLD);
        }
    });

    it("rain allows knits only under a weatherproof layer", () => {
        for (const id of ["sweater", "cardigan"]) {
            expect(fit(id), id).toBeLessThan(OFF_WEATHER_THRESHOLD);
            expect(itemWeatherFit(byId(id), rain, { shell: true }), id).toBeGreaterThanOrEqual(OFF_WEATHER_THRESHOLD);
        }
        // A shell doesn't excuse leather.
        expect(itemWeatherFit(byId("leather"), rain, { shell: true })).toBeLessThan(OFF_WEATHER_THRESHOLD);
    });

    it("rain favours a waterproof layer and boots", () => {
        expect(fit("raincoat")).toBeGreaterThanOrEqual(0.8);
        expect(fit("boots")).toBeGreaterThanOrEqual(0.8);
    });

    it("a cooler band can't rescue a piece the rain rules out", () => {
        // A jacket is "strong" for cool weather, but leather is still out when it rains.
        expect(fit("leather", readWeather(weather(9, "Cloudy")))).toBeGreaterThanOrEqual(0.8);
        expect(fit("leather")).toBeLessThan(OFF_WEATHER_THRESHOLD);
    });

    it("does not mistake a button-down shirt for a down jacket", () => {
        expect(fit("oxford", readWeather(weather(30, "Sunny")))).toBeGreaterThanOrEqual(OFF_WEATHER_THRESHOLD);
    });

    it("heat rules out puffers but keeps a rain jacket on a hot, rainy day", () => {
        const hot = readWeather(weather(29, "Sunny"));
        expect(fit("puffer", hot)).toBeLessThan(OFF_WEATHER_THRESHOLD);
        expect(fit("shorts", hot)).toBeGreaterThanOrEqual(0.8);
        expect(fit("raincoat", readWeather(weather(28, "Thunderstorms")))).toBeGreaterThanOrEqual(OFF_WEATHER_THRESHOLD);
    });

    it("cold rules out shorts, sandals and sundresses", () => {
        const cold = readWeather(weather(2, "Clear"));
        for (const id of ["shorts", "sandals", "sundress"]) expect(fit(id, cold), id).toBeLessThan(OFF_WEATHER_THRESHOLD);
    });

    it("scores everything neutral with no weather", () => {
        expect(itemWeatherFit(byId("leather"), null)).toBe(0.5);
    });
});

describe("applyWeatherNeeds", () => {
    it("in rain adds the waterproof layer and swaps shoes for boots", () => {
        const rain = readWeather(weather(10, "Showers"));
        const look = applyWeatherNeeds([byId("tee"), byId("jeans"), byId("sneakers")], closet, rain);
        expect(look.map((c) => c.id)).toEqual(["raincoat", "tee", "jeans", "boots"]);
    });

    it("in the cold adds a coat when the look has no outer layer", () => {
        const cold = readWeather(weather(1, "Clear"));
        const look = applyWeatherNeeds([byId("oxford"), byId("chinos")], closet, cold);
        expect(look[0].category).toBe(ClothingCategory.Outerwear);
    });

    it("leaves a look alone on a mild dry day or with no weather", () => {
        const look = [byId("tee"), byId("jeans"), byId("sneakers")];
        expect(applyWeatherNeeds(look, closet, readWeather(weather(20, "Sunny")))).toEqual(look);
        expect(applyWeatherNeeds(look, closet, null)).toEqual(look);
    });
});

describe("weather in the stylist pipeline", () => {
    it("keeps rain-breaking pieces out of the Stylist's candidates", () => {
        const { items } = selectMoodCandidates(closet, "casual", readWeather(weather(9, "Rain")));
        const ids = items.map((c) => c.id);
        expect(ids).toContain("raincoat");
        expect(ids).not.toContain("leather");
        expect(ids).not.toContain("suede");
        // The raincoat can go over a knit, so knits stay.
        expect(ids).toContain("sweater");
    });

    it("drops knits in the rain when there is no weatherproof layer to wear over them", () => {
        const noShell = closet.filter((c) => c.id !== "raincoat");
        const ids = selectMoodCandidates(noShell, "casual", readWeather(weather(9, "Rain"))).items.map((c) => c.id);
        expect(ids).not.toContain("sweater");
        expect(ids).not.toContain("cardigan");
    });

    it("code-built looks in the rain all wear the raincoat and boots", () => {
        const looks = buildCodeLooks(closet, casual, weather(9, "Light Rain"));
        expect(looks.length).toBeGreaterThan(0);
        for (const look of looks) {
            const ids = look.items.map((c) => c.id);
            expect(ids).toContain("raincoat");
            expect(ids).toContain("boots");
            expect(ids).not.toContain("leather");
        }
    });

    it("scores a knit under a raincoat as fine and a bare knit in the rain as wrong", () => {
        const rain = readWeather(weather(9, "Rain"));
        const covered = computeWeatherMatch([byId("raincoat"), byId("sweater"), byId("jeans"), byId("boots")], 9, rain);
        const bare = computeWeatherMatch([byId("sweater"), byId("jeans"), byId("boots")], 9, rain);
        expect(covered).toBeGreaterThan(bare);
    });

    it("scores a rain-ready look above a leather-and-suede one", () => {
        const rain = readWeather(weather(9, "Rain"));
        const ready = computeWeatherMatch([byId("raincoat"), byId("tee"), byId("jeans"), byId("boots")], 9, rain);
        const wrong = computeWeatherMatch([byId("leather"), byId("tee"), byId("jeans"), byId("suede")], 9, rain);
        expect(ready).toBeGreaterThan(wrong);
        // Without weather rules the score is the season share alone, as before.
        expect(computeWeatherMatch([byId("tee")], 9)).toBe(100);
    });

    it("keys cached looks on wind and feels-like too", () => {
        expect(weatherCacheBucket(weather(14, "Cloudy", { windSpeed: 40 }))).not.toBe(weatherCacheBucket(weather(14, "Cloudy")));
        expect(weatherCacheBucket(weather(8, "Cloudy", { feelsLike: 3 }))).not.toBe(weatherCacheBucket(weather(8, "Cloudy")));
    });
});

describe("starter catalog rain gear", () => {
    it("ships a rain jacket and a trench coat that the rain rules treat as weatherproof layers", () => {
        for (const slug of ["outerwear-rain-jacket", "outerwear-trench-coat"]) {
            const entry = STARTER_CATALOG.find((e) => e.slug === slug);
            expect(entry, slug).toBeDefined();
            const item = buildCatalogItem(entry!);
            expect(isWeatherproofOuter(item), slug).toBe(true);
            expect(itemWeatherFit(item, readWeather(weather(9, "Rain")))).toBeGreaterThanOrEqual(0.8);
        }
    });
});

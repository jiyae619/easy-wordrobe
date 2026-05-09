import {
    ClothingCategory,
    Season,
    type ClothingItem,
    type FashionMood,
    type ItemBoundingBox,
    type OutfitSuggestion,
    type UserInsight,
    type WearRecord,
} from "../../types";
import { AgentError, type AgentName } from "./agentErrors";

export const VALID_MOODS = [
    "professional",
    "casual",
    "sporty",
    "creative",
    "romantic",
] as const;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type JsonRecord = Record<string, unknown>;
type RawBoundingBox = Partial<Record<"x" | "y" | "width" | "height", unknown>>;

export type IntakeNormalization =
    | { status: "restricted" }
    | { status: "items"; items: JsonRecord[] }
    | { status: "invalid"; message: string };

export interface StylistMappingResult {
    suggestions: OutfitSuggestion[];
    invalidIdsDropped: number;
    invalidOutfitsDropped: number;
}

export interface BehavioralNormalizationResult {
    insight: UserInsight;
    invalidIdsDropped: number;
}

export function sanitizeUiCopy(text: string): string {
    return text.replace(/[—–-]/g, " ").replace(/\s+/g, " ").trim();
}

export function isRecord(value: unknown): value is JsonRecord {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function finiteNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function nonNegativeInteger(value: unknown): number {
    const parsed = finiteNumber(value);
    return parsed === null ? 0 : Math.max(0, Math.round(parsed));
}

function score(value: unknown, fallback: number): number {
    const parsed = finiteNumber(value);
    return parsed === null ? fallback : clamp(Math.round(parsed), 0, 100);
}

function isValidHex(value: unknown): value is string {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

export function normalizeColorHex(value: unknown, fallback = "#000000"): string {
    return isValidHex(value) ? value.toUpperCase() : fallback;
}

export function normalizeMoodIds(...sources: unknown[]): string[] {
    const values = sources.flatMap((source) => Array.isArray(source) ? source : []);
    return [...new Set(
        values.filter((value): value is typeof VALID_MOODS[number] =>
            typeof value === "string" && VALID_MOODS.includes(value as typeof VALID_MOODS[number])
        )
    )];
}

export function moodIdsForStyling(item: Pick<ClothingItem, "userMoods" | "aiTags">): string[] {
    return normalizeMoodIds(item.userMoods, item.aiTags);
}

export function normalizeIntakeResponse(raw: unknown): IntakeNormalization {
    const payload = Array.isArray(raw)
        ? raw.filter(isRecord)
        : isRecord(raw)
            ? [raw]
            : null;

    if (!payload) {
        return { status: "invalid", message: "Intake response was not an object or array." };
    }
    if (payload.some((item) => item.isRestricted === true)) {
        return { status: "restricted" };
    }

    const safeItems = payload.filter((item) => item.isRestricted !== true);
    if (safeItems.length === 0) {
        return { status: "invalid", message: "Intake response contained no safe clothing items." };
    }

    return { status: "items", items: safeItems };
}

export function parseBoundingBox(raw: RawBoundingBox): ItemBoundingBox | undefined {
    const x = finiteNumber(raw.x);
    const y = finiteNumber(raw.y);
    const width = finiteNumber(raw.width);
    const height = finiteNumber(raw.height);

    if (x === null || y === null || width === null || height === null || width <= 0 || height <= 0) {
        return undefined;
    }

    const normalized: ItemBoundingBox = {
        x: clamp(x, 0, 1),
        y: clamp(y, 0, 1),
        width: clamp(width, 0, 1),
        height: clamp(height, 0, 1),
    };

    if (normalized.x + normalized.width > 1) {
        normalized.width = clamp(1 - normalized.x, 0, 1);
    }
    if (normalized.y + normalized.height > 1) {
        normalized.height = clamp(1 - normalized.y, 0, 1);
    }

    return normalized.width > 0 && normalized.height > 0 ? normalized : undefined;
}

export function mapIntakeItem(
    raw: JsonRecord,
    imageBase64: string,
    createId: () => string
): ClothingItem {
    const validCategories = Object.values(ClothingCategory);
    const validSeasons = Object.values(Season);
    const rawSeason = Array.isArray(raw.season) ? raw.season : [];
    const season = rawSeason.filter((item): item is Season =>
        typeof item === "string" && validSeasons.includes(item as Season)
    );
    const moods = normalizeMoodIds(raw.mood, raw.userMoods, raw.aiTags);
    const detectionConfidence = finiteNumber(raw.confidence);
    const category = typeof raw.category === "string" && validCategories.includes(raw.category as ClothingCategory)
        ? raw.category as ClothingCategory
        : ClothingCategory.Tops;

    return {
        id: createId(),
        imageUrl: imageBase64,
        sourceImageUrl: imageBase64,
        category,
        subcategory: typeof raw.subcategory === "string" && raw.subcategory.trim() ? raw.subcategory : "Unknown",
        color: typeof raw.color === "string" && raw.color.trim() ? raw.color : "Unknown",
        colorHex: normalizeColorHex(raw.colorHex),
        season: season.length > 0 ? season : [Season.Spring],
        wearFrequency: 0,
        lastWorn: null,
        dateAdded: new Date(),
        aiTags: moods,
        userMoods: moods,
        userNotes: raw.hasNoisyBackground === true ? "Consider retaking with a plain background" : "",
        detectionBox: isRecord(raw.bbox) ? parseBoundingBox(raw.bbox as RawBoundingBox) : undefined,
        detectionConfidence: detectionConfidence === null ? undefined : clamp(detectionConfidence, 0, 1),
    };
}

export function parseAgentJson(text: string, agent: AgentName, traceId?: string): unknown {
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new AgentError(agent, "parse_error", "Agent response was not valid JSON.", { traceId, cause: error });
    }
}

export function normalizeStylistRawSuggestions(raw: unknown): unknown[] {
    if (Array.isArray(raw)) return raw;
    if (isRecord(raw) && Array.isArray(raw.outfits)) return raw.outfits;
    if (isRecord(raw) && Array.isArray(raw.suggestions)) return raw.suggestions;
    return [];
}

export function mapStylistSuggestions(
    raw: unknown,
    clothes: ClothingItem[],
    mood: FashionMood,
    createId: () => string
): StylistMappingResult {
    const clothesById = new Map(clothes.map((item) => [item.id, item]));
    const rawSuggestions = normalizeStylistRawSuggestions(raw);
    let invalidIdsDropped = 0;
    let invalidOutfitsDropped = 0;

    const suggestions = rawSuggestions
        .map((suggestion): OutfitSuggestion | null => {
            if (!isRecord(suggestion)) {
                invalidOutfitsDropped += 1;
                return null;
            }

            const itemIds = Array.isArray(suggestion.itemIds)
                ? suggestion.itemIds.filter((id): id is string => typeof id === "string")
                : [];
            if (itemIds.length === 0) {
                invalidOutfitsDropped += 1;
                return null;
            }

            const orderedUniqueItems = [...new Set(itemIds)]
                .map((id) => {
                    const item = clothesById.get(id);
                    if (!item) invalidIdsDropped += 1;
                    return item;
                })
                .filter((item): item is ClothingItem => Boolean(item));

            const topLayers = orderedUniqueItems.filter((item) =>
                item.category === ClothingCategory.Tops || item.category === ClothingCategory.Outerwear
            );
            const bottoms = orderedUniqueItems.filter((item) => item.category === ClothingCategory.Bottoms);

            if (topLayers.length === 0 || bottoms.length === 0) {
                invalidOutfitsDropped += 1;
                return null;
            }

            const outfitItems = [...topLayers, bottoms[0]];
            const explanation = typeof suggestion.explanation === "string"
                ? sanitizeUiCopy(suggestion.explanation)
                : "";

            return {
                id: createId(),
                items: outfitItems,
                mood,
                weatherMatch: score(suggestion.weatherMatch, 80),
                wearScore: score(suggestion.wearScore, 80),
                explanation,
            };
        })
        .filter((suggestion): suggestion is OutfitSuggestion => Boolean(suggestion));

    return { suggestions, invalidIdsDropped, invalidOutfitsDropped };
}

export function computeLeastWornItems(
    clothes: ClothingItem[],
    recentHistory: WearRecord[],
    currentSeason: Season,
    limit: number
): ClothingItem[] {
    const wornIds = new Set(recentHistory.flatMap((record) => record.outfitItems));
    return clothes
        .filter((item) => !wornIds.has(item.id) && item.season.includes(currentSeason))
        .slice(0, limit);
}

function computeMostWornItems(clothes: ClothingItem[], recentHistory: WearRecord[]): UserInsight["mostWornItems"] {
    const counts = new Map<string, number>();
    recentHistory.flatMap((record) => record.outfitItems).forEach((id) => {
        counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    return [...counts.entries()]
        .map(([id, count]) => {
            const item = clothes.find((candidate) => candidate.id === id);
            return item ? { item, count } : null;
        })
        .filter((entry): entry is UserInsight["mostWornItems"][number] => Boolean(entry))
        .sort((a, b) => b.count - a.count);
}

export function computeMostWornColors(
    clothes: ClothingItem[],
    recentHistory: WearRecord[]
): UserInsight["mostWornColors"] {
    const clothesById = new Map(clothes.map((item) => [item.id, item]));
    const colorCounts = new Map<string, { color: string; hex: string; count: number }>();

    recentHistory.flatMap((record) => record.outfitItems).forEach((id) => {
        const item = clothesById.get(id);
        if (!item) return;
        const key = item.color.toLowerCase();
        const existing = colorCounts.get(key) ?? { color: item.color, hex: normalizeColorHex(item.colorHex, "#808080"), count: 0 };
        existing.count += 1;
        colorCounts.set(key, existing);
    });

    return [...colorCounts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
}

export function normalizeBehavioralInsights(
    raw: unknown,
    clothes: ClothingItem[],
    recentHistory: WearRecord[],
    currentSeason: Season,
    fallbackNudges: (items: ClothingItem[]) => string[]
): BehavioralNormalizationResult {
    const payload = isRecord(raw) ? raw : {};
    const clothesById = new Map(clothes.map((item) => [item.id, item]));
    const recentWornIds = new Set(recentHistory.flatMap((record) => record.outfitItems));
    let invalidIdsDropped = 0;

    const mostWornItems = Array.isArray(payload.mostWornItemIds)
        ? payload.mostWornItemIds
            .map((entry) => {
                if (!isRecord(entry) || typeof entry.id !== "string") {
                    invalidIdsDropped += 1;
                    return null;
                }
                const item = clothesById.get(entry.id);
                if (!item) {
                    invalidIdsDropped += 1;
                    return null;
                }
                return { item, count: nonNegativeInteger(entry.count) };
            })
            .filter((entry): entry is UserInsight["mostWornItems"][number] => entry !== null && entry.count > 0)
        : computeMostWornItems(clothes, recentHistory);

    const aiLeastWorn = Array.isArray(payload.leastWornItemIds)
        ? payload.leastWornItemIds
            .map((id) => {
                if (typeof id !== "string") {
                    invalidIdsDropped += 1;
                    return null;
                }
                const item = clothesById.get(id);
                if (!item || !item.season.includes(currentSeason) || recentWornIds.has(item.id)) {
                    invalidIdsDropped += 1;
                    return null;
                }
                return item;
            })
            .filter((item): item is ClothingItem => Boolean(item))
        : [];
    const leastWornItems = aiLeastWorn.length > 0
        ? aiLeastWorn.slice(0, 5)
        : computeLeastWornItems(clothes, recentHistory, currentSeason, 5);

    const suggestedVariations = Array.isArray(payload.suggestedVariations)
        ? payload.suggestedVariations
            .filter((line): line is string => typeof line === "string" && line.trim().length > 0)
            .map(sanitizeUiCopy)
            .slice(0, 3)
        : [];

    const rawColors = Array.isArray(payload.mostWornColors) ? payload.mostWornColors : [];
    const mostWornColors = rawColors
        .map((entry) => {
            if (!isRecord(entry) || typeof entry.color !== "string") return null;
            return {
                color: entry.color,
                hex: normalizeColorHex(entry.hex, "#808080"),
                count: nonNegativeInteger(entry.count),
            };
        })
        .filter((entry): entry is UserInsight["mostWornColors"][number] => entry !== null && entry.count > 0);

    const rawWeekly = Array.isArray(payload.weeklyWearPattern) ? payload.weeklyWearPattern : [];
    const weeklyCounts = new Map<string, number>();
    rawWeekly.forEach((entry) => {
        if (!isRecord(entry) || typeof entry.day !== "string" || !DAYS.includes(entry.day as typeof DAYS[number])) return;
        weeklyCounts.set(entry.day, nonNegativeInteger(entry.count));
    });
    if (weeklyCounts.size === 0) {
        recentHistory.forEach((record) => {
            const date = record.date instanceof Date ? record.date : new Date(record.date);
            if (!Number.isFinite(date.getTime())) return;
            const day = DAYS[(date.getDay() + 6) % 7];
            weeklyCounts.set(day, (weeklyCounts.get(day) ?? 0) + 1);
        });
    }

    return {
        insight: {
            mostWornColors: mostWornColors.length > 0 ? mostWornColors : computeMostWornColors(clothes, recentHistory),
            mostWornItems,
            leastWornItems,
            suggestedVariations: suggestedVariations.length > 0
                ? suggestedVariations
                : fallbackNudges(leastWornItems).map(sanitizeUiCopy),
            weeklyWearPattern: DAYS.map((day) => ({ day, count: weeklyCounts.get(day) ?? 0 })),
        },
        invalidIdsDropped,
    };
}

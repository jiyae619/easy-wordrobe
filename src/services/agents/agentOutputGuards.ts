import {
    ClothingCategory,
    Season,
    type ClothingItem,
    type FashionMood,
    type ItemBoundingBox,
    type OutfitSuggestion,
    type SuggestionEvent,
    type UserInsight,
    type WearRecord,
} from "../../types";
import { AgentError, type AgentName } from "./agentErrors";
import { nearestPaletteColor } from "../../data/colorPalette";

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

// ==========================================
// Deterministic seasonality & outfit scoring
// Counting/scoring is code's job, never the model's (CLAUDE.md Rule 5 / AGENTS.md).
// ==========================================

export const ALL_SEASONS: Season[] = [Season.Spring, Season.Summer, Season.Fall, Season.Winter];

const THREE_WEEKS_MS = 21 * 24 * 60 * 60 * 1000;

// Latitude hint for hemisphere-aware seasons, set from the weather fetch — the one place a real
// coordinate is known. `null` means "unknown" and preserves the original Northern-hemisphere mapping.
let knownLatitude: number | null = null;

/** Record the user's latitude so seasonal logic can flip for the Southern hemisphere. */
export function setSeasonLatitude(latitude: number): void {
    if (Number.isFinite(latitude)) knownLatitude = latitude;
}

const OPPOSITE_SEASON: Record<Season, Season> = {
    [Season.Spring]: Season.Fall,
    [Season.Summer]: Season.Winter,
    [Season.Fall]: Season.Spring,
    [Season.Winter]: Season.Summer,
};

/**
 * Current season from the local month, hemisphere-aware when a latitude has been recorded (via
 * setSeasonLatitude). Southern-hemisphere seasons are the Northern mapping shifted by six months.
 * With no latitude known yet, it falls back to the Northern-hemisphere mapping (the original behavior).
 */
export function getCurrentSeason(): Season {
    const month = new Date().getMonth() + 1; // 1–12
    const northern: Season =
        month >= 3 && month <= 5 ? Season.Spring :
        month >= 6 && month <= 8 ? Season.Summer :
        month >= 9 && month <= 11 ? Season.Fall :
        Season.Winter;

    return knownLatitude !== null && knownLatitude < 0 ? OPPOSITE_SEASON[northern] : northern;
}

function seasonForTemperature(temperatureC: number): Season {
    if (temperatureC <= 5) return Season.Winter;
    if (temperatureC <= 15) return Season.Fall;
    if (temperatureC <= 24) return Season.Spring;
    return Season.Summer;
}

/**
 * Weather appropriateness (0-100), computed from item seasons vs. the current temperature.
 * 100 when every item suits the temperature's season, 50 when none do. Never read from the model.
 */
export function computeWeatherMatch(items: ClothingItem[], temperatureC: number): number {
    if (items.length === 0) return 0;
    const target = seasonForTemperature(temperatureC);
    const matching = items.filter((item) => item.season.includes(target)).length;
    return clamp(Math.round(50 + 50 * (matching / items.length)), 0, 100);
}

/**
 * Rotation priority (0-100), computed from real wear counts — higher for less-worn outfits,
 * measured against the most-worn item in the wardrobe. Never read from the model.
 */
export function computeWearScore(items: ClothingItem[], wardrobe: ClothingItem[]): number {
    if (items.length === 0) return 0;
    const maxWear = Math.max(1, ...wardrobe.map((item) => item.wearFrequency));
    const avgWear = items.reduce((sum, item) => sum + item.wearFrequency, 0) / items.length;
    return clamp(Math.round(100 * (1 - avgWear / maxWear)), 0, 100);
}

export interface WardrobeReadiness {
    /** True when the wardrobe can form at least one valid outfit (top+bottom OR a dress). */
    canMakeOutfit: boolean;
    hasTopLayer: boolean;
    hasBottom: boolean;
    hasDress: boolean;
    hasShoes: boolean;
    /** Human-readable pieces to add to unlock outfit suggestions (empty when already able). */
    missingForOutfit: string[];
}

/**
 * Whether the wardrobe can produce any outfit under the same rules the Stylist enforces, and if
 * not, what's missing. Lets the UI tell a new user exactly what to add (e.g. "add a bottom") instead
 * of showing an empty suggestions screen with no explanation.
 */
export function getWardrobeReadiness(clothes: ClothingItem[]): WardrobeReadiness {
    const hasTopLayer = clothes.some((c) => c.category === ClothingCategory.Tops || c.category === ClothingCategory.Outerwear);
    const hasBottom = clothes.some((c) => c.category === ClothingCategory.Bottoms);
    const hasDress = clothes.some((c) => c.category === ClothingCategory.Dresses);
    const hasShoes = clothes.some((c) => c.category === ClothingCategory.Shoes);
    const canMakeOutfit = (hasTopLayer && hasBottom) || hasDress;

    const missingForOutfit: string[] = [];
    if (!canMakeOutfit) {
        if (!hasTopLayer) missingForOutfit.push("a top or jacket");
        if (!hasBottom) missingForOutfit.push("a bottom");
    }

    return { canMakeOutfit, hasTopLayer, hasBottom, hasDress, hasShoes, missingForOutfit };
}

export interface WardrobeCompleteness {
    /** 0..1 progress across the starter milestones, for a meter/progress bar. */
    ratio: number;
    /** Short human label for the current stage. */
    stage: string;
    /** The single most valuable next addition, or null once the starter closet is complete. */
    nextUnlock: string | null;
}

/**
 * Graduated "how complete is this wardrobe" signal for the Home meter — deterministic, no model.
 * Milestones are ordered by value; the first unmet one becomes the nudge. Complements
 * getWardrobeReadiness (which answers the binary "can we style at all?") by guiding growth past
 * the first outfit.
 */
export function getWardrobeCompleteness(clothes: ClothingItem[]): WardrobeCompleteness {
    const readiness = getWardrobeReadiness(clothes);
    const milestones: Array<{ met: boolean; unlock: string }> = [
        {
            met: readiness.canMakeOutfit,
            unlock: readiness.missingForOutfit.length > 0
                ? `Add ${readiness.missingForOutfit.join(" and ")} to make your first outfit`
                : "Add a top and a bottom to make your first outfit",
        },
        { met: clothes.length >= 5, unlock: "Add a few more pieces for outfit variety" },
        { met: clothes.length >= 8, unlock: "A few more pieces unlock richer combinations" },
        { met: readiness.hasShoes, unlock: "Add shoes to finish your looks" },
    ];
    const metCount = milestones.filter((m) => m.met).length;
    const next = milestones.find((m) => !m.met) ?? null;
    const stage = metCount >= milestones.length
        ? "Closet looking complete"
        : metCount === 0
            ? "Just getting started"
            : "Building your closet";
    return { ratio: metCount / milestones.length, stage, nextUnlock: next?.unlock ?? null };
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

    // Color: snap to the nearest palette color for BOTH the display name and the swatch hex, so the
    // shown swatch always matches its label. The model's raw detection is preserved untouched in
    // `aiColor` so a later user correction can still be scored against the original guess.
    const rawColorName = typeof raw.color === "string" && raw.color.trim() ? raw.color : "Unknown";
    const rawColorHex = normalizeColorHex(raw.colorHex);
    const snapped = nearestPaletteColor(rawColorHex);

    return {
        id: createId(),
        imageUrl: imageBase64,
        sourceImageUrl: imageBase64,
        category,
        subcategory: typeof raw.subcategory === "string" && raw.subcategory.trim() ? raw.subcategory : "Unknown",
        color: snapped.name,
        colorHex: snapped.hex,
        aiColor: { name: rawColorName, hex: rawColorHex },
        colorSource: "ai",
        season: season.length > 0 ? season : [...ALL_SEASONS],
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
    createId: () => string,
    temperatureC: number
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
            const dresses = orderedUniqueItems.filter((item) => item.category === ClothingCategory.Dresses);
            const outerwear = orderedUniqueItems.filter((item) => item.category === ClothingCategory.Outerwear);
            const shoes = orderedUniqueItems.filter((item) => item.category === ClothingCategory.Shoes);

            // A valid outfit is EITHER bottoms-based (1 bottom + >=1 top layer) OR dress-based
            // (1 dress + optional outerwear). Matches the AGENTS.md composition rules.
            let outfitItems: ClothingItem[] | null = null;
            if (topLayers.length > 0 && bottoms.length > 0) {
                outfitItems = [...topLayers, bottoms[0]];
            } else if (dresses.length > 0) {
                outfitItems = [dresses[0], ...outerwear];
            }

            if (!outfitItems) {
                invalidOutfitsDropped += 1;
                return null;
            }

            // Shoes are an optional finishing item on either shape (at most one).
            if (shoes.length > 0) {
                outfitItems = [...outfitItems, shoes[0]];
            }

            const explanation = typeof suggestion.explanation === "string"
                ? sanitizeUiCopy(suggestion.explanation)
                : "";

            return {
                id: createId(),
                items: outfitItems,
                mood,
                // Scores are computed from real data — the model's self-reported numbers are ignored.
                weatherMatch: computeWeatherMatch(outfitItems, temperatureC),
                wearScore: computeWearScore(outfitItems, clothes),
                explanation,
            };
        })
        .filter((suggestion): suggestion is OutfitSuggestion => Boolean(suggestion));

    return { suggestions, invalidIdsDropped, invalidOutfitsDropped };
}

function lastActivityMs(item: ClothingItem): number {
    const ref = item.lastWorn ?? item.dateAdded;
    const time = new Date(ref).getTime();
    return Number.isFinite(time) ? time : 0;
}

export function computeLeastWornItems(
    clothes: ClothingItem[],
    recentHistory: WearRecord[],
    currentSeason: Season,
    limit: number
): ClothingItem[] {
    const wornIds = new Set(recentHistory.flatMap((record) => record.outfitItems));
    const graceCutoff = Date.now() - THREE_WEEKS_MS;
    return clothes
        .filter((item) =>
            !wornIds.has(item.id) &&
            item.season.includes(currentSeason) &&
            // Grace period: an item must be owned 3+ weeks before it counts as "neglected", so a
            // freshly added wardrobe is not nudged about with false "unworn for weeks" claims.
            new Date(item.dateAdded).getTime() <= graceCutoff
        )
        .sort((a, b) => lastActivityMs(a) - lastActivityMs(b))
        .slice(0, limit);
}

/**
 * Behavioral priority IDs (least-worn, in-season, owned 3+ weeks) computed directly from wear
 * history with no model call. Lets StylistAgent honor wear-history priorities on every request,
 * regardless of whether the Insights page (BehavioralAgent) has run this session.
 */
export function computeSeasonalLeastWornIds(
    clothes: ClothingItem[],
    outfits: WearRecord[],
    limit = 8
): string[] {
    const cutoff = Date.now() - THREE_WEEKS_MS;
    const recentHistory = outfits.filter((record) => {
        const time = new Date(record.date).getTime();
        return Number.isFinite(time) && time >= cutoff;
    });
    return computeLeastWornItems(clothes, recentHistory, getCurrentSeason(), limit).map((item) => item.id);
}

const SKIP_THRESHOLD = 3;

/**
 * Items the user consistently skips: shown & passed over at least SKIP_THRESHOLD times and never
 * once worn. Conservative on purpose — the wearFrequency guard means it can never deprioritize an
 * item the user actually wears. Fed into the Stylist so repeatedly rejected pieces surface less.
 */
export function computeDeprioritizedItemIds(events: SuggestionEvent[], clothes: ClothingItem[]): string[] {
    const wearFreqById = new Map(clothes.map((item) => [item.id, item.wearFrequency]));
    const skipCounts = new Map<string, number>();
    for (const event of events) {
        for (const id of event.itemIds) {
            skipCounts.set(id, (skipCounts.get(id) ?? 0) + 1);
        }
    }
    return [...skipCounts.entries()]
        .filter(([id, count]) => count >= SKIP_THRESHOLD && (wearFreqById.get(id) ?? 0) === 0)
        .map(([id]) => id);
}

/**
 * A short, honest "because" line for an outfit — derived in code from the real priority context and
 * the items actually in the outfit (never asked of the model). Explains why this look surfaced:
 * a "Try it" request, a neglected item being rotated in, or weather fit. Returns null if nothing
 * notable to say.
 */
export function describeOutfitReason(
    suggestion: OutfitSuggestion,
    context: { tryItItemIds: string[]; leastWornItemIds: string[] },
    weather?: { temperature: number; condition: string },
): string | null {
    const tryItSet = new Set(context.tryItItemIds);
    const leastWornSet = new Set(context.leastWornItemIds);

    const tried = suggestion.items.find((item) => tryItSet.has(item.id));
    if (tried) {
        return `Featuring the ${tried.color.toLowerCase()} ${tried.subcategory.toLowerCase()} you wanted to try.`;
    }

    const neglected = suggestion.items.find((item) => leastWornSet.has(item.id));
    if (neglected) {
        return `Bringing your ${neglected.color.toLowerCase()} ${neglected.subcategory.toLowerCase()} back into rotation.`;
    }

    if (weather) {
        return `Picked for today's ${Math.round(weather.temperature)}° ${weather.condition.toLowerCase()}.`;
    }

    return null;
}

function toLocalDateKey(date: Date): string {
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Consecutive-day outfit-logging streak (local calendar days). `loggedToday` tells the UI whether
 * today already counts. If today isn't logged yet the streak still counts up to yesterday, so the
 * UI can nudge "log today to keep it going" without prematurely showing the streak as broken.
 */
export function computeWearStreak(outfits: WearRecord[]): { current: number; loggedToday: boolean } {
    const days = new Set<string>();
    for (const record of outfits) {
        const date = record.date instanceof Date ? record.date : new Date(record.date);
        if (Number.isFinite(date.getTime())) days.add(toLocalDateKey(date));
    }

    const loggedToday = days.has(toLocalDateKey(new Date()));

    let current = 0;
    const cursor = new Date();
    if (!loggedToday) cursor.setDate(cursor.getDate() - 1);
    while (days.has(toLocalDateKey(cursor))) {
        current += 1;
        cursor.setDate(cursor.getDate() - 1);
    }

    return { current, loggedToday };
}

/** Share of the wardrobe worn in the last 30 days — a gentle "use more of your closet" stat. */
export function computeMonthlyRotation(
    clothes: ClothingItem[],
    outfits: WearRecord[],
): { worn: number; total: number; percent: number } {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentWornIds = new Set(
        outfits
            .filter((record) => {
                const time = new Date(record.date).getTime();
                return Number.isFinite(time) && time >= cutoff;
            })
            .flatMap((record) => record.outfitItems),
    );
    const total = clothes.length;
    const worn = clothes.filter((item) => recentWornIds.has(item.id)).length;
    const percent = total > 0 ? Math.round((100 * worn) / total) : 0;
    return { worn, total, percent };
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

export function computeWeeklyWearPattern(recentHistory: WearRecord[]): UserInsight["weeklyWearPattern"] {
    const weeklyCounts = new Map<string, number>();
    recentHistory.forEach((record) => {
        const date = record.date instanceof Date ? record.date : new Date(record.date);
        if (!Number.isFinite(date.getTime())) return;
        const day = DAYS[(date.getDay() + 6) % 7];
        weeklyCounts.set(day, (weeklyCounts.get(day) ?? 0) + 1);
    });
    return DAYS.map((day) => ({ day, count: weeklyCounts.get(day) ?? 0 }));
}

/**
 * Compute every analytics field deterministically from wear history — no LLM involved.
 * Counting is exact code; the model only writes nudge copy on top of these numbers
 * (see BehavioralAgent). This is why that agent can run hot (temp 0.85) without risking
 * the integrity of the counts.
 */
export function computeBehavioralAnalytics(
    clothes: ClothingItem[],
    recentHistory: WearRecord[],
    currentSeason: Season
): Omit<UserInsight, "suggestedVariations"> {
    return {
        mostWornColors: computeMostWornColors(clothes, recentHistory),
        mostWornItems: computeMostWornItems(clothes, recentHistory),
        leastWornItems: computeLeastWornItems(clothes, recentHistory, currentSeason, 5),
        weeklyWearPattern: computeWeeklyWearPattern(recentHistory),
    };
}

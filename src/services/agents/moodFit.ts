import { ClothingCategory, type ClothingItem } from '../../types';
import { getMoodStyle, type MoodStyle } from '../../data/moodStyles';
import { getCurrentSeason, moodIdsForStyling, seasonForTemperature } from './agentOutputGuards';

/**
 * Code-side mood fit: how well a piece suits a mood, from its subcategory, color and the user's own
 * mood tags, scored against the curated rules in data/moodStyles. Deterministic and instant, so it
 * runs on every Stylist request: it removes clashing pieces from the prompt, ranks the AI's looks,
 * and drives the code-assembled looks (fallback and instant preview).
 */

/** Below this a piece clashes with the mood and is kept out of the Stylist prompt. */
export const OFF_MOOD_THRESHOLD = 0.35;
/** At or above this a piece is textbook for the mood ("high" fit in the prompt). */
export const HIGH_FIT_THRESHOLD = 0.7;

const NEUTRAL_COLORS = new Set(['black', 'grey', 'white', 'cream', 'beige', 'brown', 'navy']);

/** Lowercase, hyphens to spaces, every spelling of t-shirt to "tshirt" (so "shirt" won't match it). */
function normalizeText(text: string): string {
    return ` ${text.toLowerCase().replace(/[-_/]+/g, ' ').replace(/\bt\s?shirts?\b/g, 'tshirt').replace(/\s+/g, ' ').trim()} `;
}

const patternCache = new Map<string, RegExp>();
function termPattern(term: string): RegExp {
    let pattern = patternCache.get(term);
    if (!pattern) {
        const escaped = normalizeText(term).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = new RegExp(`\\b${escaped}(?:s|es)?\\b`);
        patternCache.set(term, pattern);
    }
    return pattern;
}

function matchesAny(text: string, terms: string[]): boolean {
    return terms.some((term) => termPattern(term).test(text));
}

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

type FitInput = Pick<ClothingItem, 'subcategory' | 'color' | 'category' | 'userMoods' | 'aiTags'>;

/**
 * Mood fit in 0..1. Starts neutral (0.5); the user's own mood tag for this mood is a strong signal,
 * a clashing garment type is the strongest one (an "avoid" keyword beats a tag), and color and
 * category add small nudges. Unknown moods score everything neutral.
 */
export function itemMoodFit(item: FitInput, moodId: string, style: MoodStyle | undefined = getMoodStyle(moodId)): number {
    if (!style) return 0.5;
    let fit = 0.5;

    const tagged = moodIdsForStyling(item);
    if (tagged.includes(moodId)) fit += 0.3;
    else if (tagged.length > 0) fit -= 0.1;

    // Free-form aiTags (non-mood words) can carry style hints too, e.g. "blazer" or "athletic".
    const freeTags = (item.aiTags ?? []).filter((t) => typeof t === 'string' && !tagged.includes(t));
    const text = normalizeText([item.subcategory, ...freeTags].join(' '));
    if (matchesAny(text, style.keywords.avoid)) fit -= 0.45;
    else if (matchesAny(text, style.keywords.strong)) fit += 0.35;
    else if (matchesAny(text, style.keywords.good)) fit += 0.15;

    const color = item.color?.trim().toLowerCase() ?? '';
    if (style.colorAffinity.good.some((c) => c.toLowerCase() === color)) fit += 0.05;
    else if (style.colorAffinity.avoid.some((c) => c.toLowerCase() === color)) fit -= 0.1;

    fit += style.categoryBias?.[item.category] ?? 0;
    return clamp01(fit);
}

export type MoodFitTier = 'high' | 'ok' | 'off';

export function moodFitTier(fit: number): MoodFitTier {
    return fit >= HIGH_FIT_THRESHOLD ? 'high' : fit >= OFF_MOOD_THRESHOLD ? 'ok' : 'off';
}

/** Outfit mood match 0-100: the mean of its pieces' fit, so one clashing piece drags it down. */
export function computeMoodMatch(items: FitInput[], moodId: string): number {
    if (items.length === 0) return 0;
    const style = getMoodStyle(moodId);
    const mean = items.reduce((sum, item) => sum + itemMoodFit(item, moodId, style), 0) / items.length;
    return Math.round(mean * 100);
}

const isTopLayer = (c: ClothingItem) => c.category === ClothingCategory.Tops || c.category === ClothingCategory.Outerwear;

/**
 * The pieces the Stylist may use for a mood: everything that is not off-mood, topped up with the
 * best-fitting pieces of any group that would otherwise be too thin to build 3 looks (at least 2
 * top layers + 2 bottoms, or 2 dresses), so a small or one-note closet still gets looks.
 */
export function selectMoodCandidates(clothes: ClothingItem[], moodId: string): { items: ClothingItem[]; fit: Map<string, number> } {
    const style = getMoodStyle(moodId);
    const fit = new Map(clothes.map((c) => [c.id, itemMoodFit(c, moodId, style)]));
    const byFit = (a: ClothingItem, b: ClothingItem) => (fit.get(b.id) ?? 0) - (fit.get(a.id) ?? 0);
    const keep = new Set(clothes.filter((c) => (fit.get(c.id) ?? 0) >= OFF_MOOD_THRESHOLD).map((c) => c.id));

    const topUp = (group: ClothingItem[], min: number) => {
        const have = group.filter((c) => keep.has(c.id)).length;
        group.filter((c) => !keep.has(c.id)).sort(byFit).slice(0, Math.max(0, min - have)).forEach((c) => keep.add(c.id));
    };
    const bottoms = clothes.filter((c) => c.category === ClothingCategory.Bottoms);
    const dresses = clothes.filter((c) => c.category === ClothingCategory.Dresses);
    const keptBottoms = bottoms.filter((c) => keep.has(c.id)).length;
    const keptDresses = dresses.filter((c) => keep.has(c.id)).length;
    if (keptBottoms > 0 || keptDresses === 0) {
        topUp(clothes.filter(isTopLayer), 2);
        topUp(bottoms, 2);
    }
    if (keptBottoms === 0) topUp(dresses, 2);

    return { items: clothes.filter((c) => keep.has(c.id)).sort(byFit), fit };
}

export interface AssembleOptions {
    /** Today's temperature in °C, or null when there is no weather (calendar season is used). */
    temperatureC: number | null;
    /** "Wear more" and least-worn items: a small boost among on-mood pieces. */
    priorityIds?: string[];
    /** Repeatedly skipped items: a penalty. */
    avoidIds?: string[];
    count?: number;
    /** 0 = fully deterministic; any other value shuffles near-ties, for "Show me more". */
    variant?: number;
}

/** Deterministic pseudo-random in [0, 1) from a string. */
function hashUnit(text: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0) / 4294967296;
}

/**
 * Code-assembled looks for a mood: bottoms-based (top layer + 1 bottom) or dress-based, each with an
 * outer layer when it is cool and a pair of shoes when there are any, ranked by mood fit first, then
 * weather fit, then wear priorities, and kept distinct from each other. Same composition rules as
 * the StylistAgent. Used when the AI is unavailable and as an instant preview while it works.
 */
export function assembleMoodLooks(clothes: ClothingItem[], moodId: string, options: AssembleOptions): ClothingItem[][] {
    const { temperatureC, priorityIds = [], avoidIds = [], count = 3, variant = 0 } = options;
    const { items, fit } = selectMoodCandidates(clothes, moodId);
    const targetSeason = temperatureC === null ? getCurrentSeason() : seasonForTemperature(temperatureC);
    const cool = temperatureC === null ? ['fall', 'winter'].includes(targetSeason) : temperatureC <= 15;
    const priority = new Set(priorityIds);
    const avoid = new Set(avoidIds.filter((id) => !priority.has(id)));

    const score = new Map(items.map((c) => [c.id,
        0.6 * (fit.get(c.id) ?? 0.5)
        + 0.25 * (c.season.includes(targetSeason) ? 1 : 0)
        + (priority.has(c.id) ? 0.12 : 0)
        - (avoid.has(c.id) ? 0.3 : 0)
        + (variant ? 0.12 * hashUnit(`${c.id}:${variant}`) : 0),
    ]));
    const s = (c: ClothingItem) => score.get(c.id) ?? 0;
    const best = (group: ClothingItem[], limit: number) => [...group].sort((a, b) => s(b) - s(a)).slice(0, limit);

    const tops = best(items.filter((c) => c.category === ClothingCategory.Tops), 10);
    const outer = best(items.filter((c) => c.category === ClothingCategory.Outerwear), 6);
    const bottoms = best(items.filter((c) => c.category === ClothingCategory.Bottoms), 10);
    const dresses = best(items.filter((c) => c.category === ClothingCategory.Dresses), 6);
    const shoes = best(items.filter((c) => c.category === ClothingCategory.Shoes), 6);

    const colorPenalty = (a: ClothingItem, b: ClothingItem) => {
        const ca = a.color.toLowerCase();
        const cb = b.color.toLowerCase();
        return !NEUTRAL_COLORS.has(ca) && !NEUTRAL_COLORS.has(cb) && ca !== cb ? 0.05 : 0;
    };
    type Base = { pieces: ClothingItem[]; score: number };
    const bases: Base[] = [];
    for (const top of [...tops, ...outer]) {
        for (const bottom of bottoms) {
            bases.push({ pieces: [top, bottom], score: (s(top) + s(bottom)) / 2 - colorPenalty(top, bottom) });
        }
    }
    for (const dress of dresses) bases.push({ pieces: [dress], score: s(dress) });
    bases.sort((a, b) => b.score - a.score);

    // Greedy, distinct: first pass never reuses a core piece; a second pass allows reuse if needed.
    const chosen: Base[] = [];
    const used = new Set<string>();
    for (const strict of [true, false]) {
        for (const base of bases) {
            if (chosen.length >= count) break;
            if (chosen.includes(base)) continue;
            if (strict && base.pieces.some((p) => used.has(p.id))) continue;
            if (!strict && chosen.some((c) => c.pieces.every((p, i) => base.pieces[i]?.id === p.id))) continue;
            chosen.push(base);
            base.pieces.forEach((p) => used.add(p.id));
        }
    }

    const usedOuter = new Set<string>();
    const usedShoes = new Set<string>();
    const pickRotating = (group: ClothingItem[], taken: Set<string>, exclude: ClothingItem[]) => {
        const options = group.filter((c) => !exclude.includes(c));
        const pick = options.find((c) => !taken.has(c.id)) ?? options[0];
        if (pick) taken.add(pick.id);
        return pick;
    };

    return chosen.map(({ pieces }) => {
        const look = [...pieces];
        const hasOuter = look.some((p) => p.category === ClothingCategory.Outerwear);
        if (cool && !hasOuter) {
            const layer = pickRotating(outer, usedOuter, look);
            if (layer) look.unshift(layer);
        }
        const shoe = pickRotating(shoes, usedShoes, look);
        if (shoe) look.push(shoe);
        return look;
    });
}

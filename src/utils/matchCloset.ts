import { ClothingCategory, type ClothingItem } from '../types';

/** Categories that can stand in for each other when matching a photo to the closet. */
const NEAR: Partial<Record<ClothingCategory, ClothingCategory[]>> = {
    [ClothingCategory.Tops]: [ClothingCategory.Outerwear],
    [ClothingCategory.Outerwear]: [ClothingCategory.Tops],
};

const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2));

function hexDistance(a?: string, b?: string): number {
    const parse = (h?: string) => {
        const m = /^#?([0-9a-f]{6})$/i.exec(h ?? '');
        if (!m) return null;
        const n = parseInt(m[1], 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const x = parse(a);
    const y = parse(b);
    if (!x || !y) return Infinity;
    return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/**
 * How well a detected piece matches one already in the closet. Category is required (tops and
 * layers count as close); colour and name words add confidence.
 */
export function matchScore(detected: Pick<ClothingItem, 'category' | 'color' | 'colorHex' | 'subcategory'>, owned: ClothingItem): number {
    let score: number;
    if (owned.category === detected.category) score = 2;
    else if (NEAR[detected.category]?.includes(owned.category)) score = 1;
    else return 0;
    if (owned.color.toLowerCase() === detected.color.toLowerCase()) score += 2;
    else if (hexDistance(owned.colorHex, detected.colorHex) < 60) score += 1;
    const a = words(detected.subcategory);
    for (const w of words(owned.subcategory)) if (a.has(w)) score += 1;
    return score;
}

/** Below this, a detected piece is offered as a new piece instead of a guess. */
export const MATCH_THRESHOLD = 4;

/** The closet piece a detected piece most likely is, or null when nothing is close enough. */
export function bestClosetMatch(
    detected: Pick<ClothingItem, 'category' | 'color' | 'colorHex' | 'subcategory'>,
    closet: ClothingItem[],
    exclude: Set<string> = new Set(),
): ClothingItem | null {
    let best: ClothingItem | null = null;
    let bestScore = 0;
    for (const item of closet) {
        if (exclude.has(item.id)) continue;
        const s = matchScore(detected, item);
        if (s > bestScore) { best = item; bestScore = s; }
    }
    return bestScore >= MATCH_THRESHOLD ? best : null;
}

/**
 * Outfit slot helpers for the reel builder (Today) and the mirror cards (Picks).
 * ------------------------------------------------------------------------------
 * An outfit is shown as up to four slots: an optional outer LAYER, a TOP, a BOTTOM (which may be a
 * dress) and optional SHOES. These helpers convert between slot selections and item lists while
 * enforcing the same composition rules the Stylist uses (AGENTS.md): bottoms-based (1 bottom + ≥1
 * top layer) or dress-based (1 dress + optional outerwear), each with optional shoes. Pure — no
 * React, no model calls — so they are cheap to run on every reel change and easy to unit test.
 */

import { ClothingCategory, type ClothingItem, type OutfitSuggestion } from '../types';
import { computeWeatherMatch } from '../services/agents/agentOutputGuards';

export type SlotId = 'layer' | 'top' | 'bottom' | 'shoes';
export const SLOT_ORDER: SlotId[] = ['layer', 'top', 'bottom', 'shoes'];

/** Item id per slot; null = slot intentionally empty ("no layer", "no top", "no shoes"). */
export type OutfitSlots = Record<SlotId, string | null>;

/** Which slot a piece belongs to. */
export function slotForItem(item: ClothingItem): SlotId {
    switch (item.category) {
        case ClothingCategory.Outerwear: return 'layer';
        case ClothingCategory.Tops: return 'top';
        case ClothingCategory.Shoes: return 'shoes';
        default: return 'bottom'; // bottoms and dresses share the bottom rail
    }
}

/** Reel options per slot. `null` entries are the explicit "none" choice. */
export type ReelOptions = Record<SlotId, Array<ClothingItem | null>>;

const byNewest = (a: ClothingItem, b: ClothingItem) =>
    new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();

export function isDress(item: ClothingItem | null | undefined): boolean {
    return item?.category === ClothingCategory.Dresses;
}

/** Options for each reel. Layer/top/shoes include a "none" choice; bottom mixes bottoms and dresses. */
export function buildReelOptions(clothes: ClothingItem[]): ReelOptions {
    const of = (cat: ClothingCategory) => clothes.filter((c) => c.category === cat).sort(byNewest);
    const outer = of(ClothingCategory.Outerwear);
    const tops = of(ClothingCategory.Tops);
    const shoes = of(ClothingCategory.Shoes);
    return {
        layer: outer.length > 0 ? [null, ...outer] : [],
        top: tops.length > 0 ? [...tops, null] : [],
        bottom: [...of(ClothingCategory.Bottoms), ...of(ClothingCategory.Dresses)],
        shoes: shoes.length > 0 ? [...shoes, null] : [],
    };
}

/** Spread an item list (e.g. an AI outfit) into slots. Extra pieces beyond one per slot are dropped. */
export function slotsFromItems(items: ClothingItem[]): OutfitSlots {
    const find = (cat: ClothingCategory) => items.find((i) => i.category === cat)?.id ?? null;
    const dress = find(ClothingCategory.Dresses);
    return {
        layer: find(ClothingCategory.Outerwear),
        top: dress ? null : find(ClothingCategory.Tops),
        bottom: dress ?? find(ClothingCategory.Bottoms),
        shoes: find(ClothingCategory.Shoes),
    };
}

/** Resolve slots to an ordered item list. A dress makes the top slot inactive. */
export function itemsFromSlots(slots: OutfitSlots, clothes: ClothingItem[]): ClothingItem[] {
    const byId = new Map(clothes.map((c) => [c.id, c]));
    const get = (id: string | null) => (id ? byId.get(id) ?? null : null);
    const bottom = get(slots.bottom);
    const parts = [get(slots.layer), isDress(bottom) ? null : get(slots.top), bottom, get(slots.shoes)];
    return parts.filter((p): p is ClothingItem => Boolean(p));
}

/** Same composition rule the Stylist validates against. */
export function isValidOutfit(items: ClothingItem[]): boolean {
    const hasDress = items.some((i) => i.category === ClothingCategory.Dresses);
    const hasBottom = items.some((i) => i.category === ClothingCategory.Bottoms);
    const hasTopLayer = items.some((i) => i.category === ClothingCategory.Tops || i.category === ClothingCategory.Outerwear);
    return hasDress || (hasBottom && hasTopLayer);
}

/**
 * Pick the AI look that best respects the user's locked slots, scanning from `cursor` so repeated
 * spins walk through the batch. Returns the look index or -1 when there are no looks.
 */
export function pickLookForLocks(looks: OutfitSuggestion[], locked: Partial<OutfitSlots>, cursor: number): number {
    if (looks.length === 0) return -1;
    const lockedEntries = Object.entries(locked) as Array<[SlotId, string | null]>;
    let best = -1;
    let bestScore = -1;
    for (let step = 0; step < looks.length; step++) {
        const idx = (cursor + step) % looks.length;
        const slots = slotsFromItems(looks[idx].items);
        const score = lockedEntries.filter(([slot, id]) => slots[slot] === id).length;
        if (score > bestScore) {
            best = idx;
            bestScore = score;
        }
    }
    return best;
}

/**
 * A code-assembled combination for unlocked slots — used when the AI batch is exhausted or not yet
 * available. Prefers priority items (least-worn / "try it"), then weather-appropriate pieces, and
 * uses `seed` to rotate through the remaining options so repeated spins vary. Never calls a model.
 */
export function assembleCodeSlots(
    options: ReelOptions,
    locked: Partial<OutfitSlots>,
    priorityIds: Set<string>,
    temperatureC: number | null,
    seed: number,
): OutfitSlots {
    const rank = (item: ClothingItem | null) => {
        if (!item) return 0;
        let score = 0;
        if (priorityIds.has(item.id)) score += 2;
        if (temperatureC != null && computeWeatherMatch([item], temperatureC) === 100) score += 1;
        return score;
    };
    const choose = (slot: SlotId, allowNone: boolean): string | null => {
        if (slot in locked) return locked[slot] ?? null;
        const pool = options[slot].filter((o) => allowNone || o !== null);
        if (pool.length === 0) return null;
        const topScore = Math.max(...pool.map(rank));
        const best = pool.filter((o) => rank(o) === topScore);
        return best[Math.abs(seed) % best.length]?.id ?? null;
    };

    // Bottom first: a dress changes what the other slots need.
    const bottom = choose('bottom', false);
    const bottomItem = options.bottom.find((o) => o?.id === bottom) ?? null;
    const dress = isDress(bottomItem);
    // Cool weather favours a layer; a "none" layer stays possible when it is warm.
    const wantsLayer = temperatureC == null || temperatureC < 18;
    const layer = choose('layer', !wantsLayer);
    const top = dress ? null : choose('top', Boolean(layer));
    const shoes = choose('shoes', false);
    return { layer, top, bottom, shoes };
}

/** Days since the item was last worn (or added, if never worn). */
export function daysIdle(item: ClothingItem, now = Date.now()): number {
    const ref = new Date(item.lastWorn ?? item.dateAdded).getTime();
    if (!Number.isFinite(ref)) return 0;
    return Math.max(0, Math.floor((now - ref) / 86_400_000));
}

/** Perceived lightness 0..1 from a hex colour, for "light → dark" ordering. */
export function lightness(hex: string): number {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex?.trim() ?? '');
    if (!m) return 0.5;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function wrapIndex(i: number, n: number): number {
    return n > 0 ? ((i % n) + n) % n : 0;
}

import type { WearRecord } from '../types';

/** Order-independent identity of an outfit. */
export const outfitKey = (ids: string[]) => [...ids].sort().join('|');

const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Outfits logged today, as outfit keys. */
export function loggedTodayKeys(outfits: WearRecord[], now = new Date()): Set<string> {
    const keys = new Set<string>();
    for (const o of outfits) {
        const d = o.date instanceof Date ? o.date : new Date(o.date);
        if (sameDay(d, now)) keys.add(outfitKey(o.outfitItems));
    }
    return keys;
}

/** True when this exact outfit is already logged today (so a second tap doesn't double-count). */
export const wornToday = (outfits: WearRecord[], itemIds: string[], now = new Date()) =>
    itemIds.length > 0 && loggedTodayKeys(outfits, now).has(outfitKey(itemIds));

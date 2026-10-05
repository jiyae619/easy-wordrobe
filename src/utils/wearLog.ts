import type { WearRecord } from '../types';

/** Order-independent identity of an outfit. */
export const outfitKey = (ids: string[]) => [...ids].sort().join('|');

export const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const toDate = (d: Date | string) => (d instanceof Date ? d : new Date(d));

/** Outfits logged on the given day, as outfit keys. */
export function loggedKeysOn(outfits: WearRecord[], day: Date): Set<string> {
    const keys = new Set<string>();
    for (const o of outfits) if (sameDay(toDate(o.date), day)) keys.add(outfitKey(o.outfitItems));
    return keys;
}

/** Outfits logged today, as outfit keys. */
export const loggedTodayKeys = (outfits: WearRecord[], now = new Date()) => loggedKeysOn(outfits, now);

/** True when this exact outfit is already logged that day (so a second tap doesn't double-count). */
export const wornOn = (outfits: WearRecord[], itemIds: string[], day: Date) =>
    itemIds.length > 0 && loggedKeysOn(outfits, day).has(outfitKey(itemIds));

export const wornToday = (outfits: WearRecord[], itemIds: string[], now = new Date()) => wornOn(outfits, itemIds, now);

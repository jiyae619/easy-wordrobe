import { startOfWeek } from 'date-fns';
import type { ClothingItem, WearRecord } from '../types';

/** A piece counts as rediscovered when it comes back after this long on the shelf. */
export const REDISCOVER_DAYS = 21;
const DAY_MS = 86_400_000;

export interface WeeklyRecapData {
    outfits: number;
    daysLogged: number;
    /** Pieces worn this week after 3+ weeks unworn (or never worn, owned 3+ weeks). */
    rediscovered: ClothingItem[];
    topColor: { name: string; hex: string; count: number } | null;
}

const time = (d: Date | string) => (d instanceof Date ? d : new Date(d)).getTime();

/** This week's (Monday to now) wear summary, computed from the wear log. */
export function computeWeeklyRecap(clothes: ClothingItem[], outfits: WearRecord[], now = new Date()): WeeklyRecapData {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
    const thisWeek = outfits.filter((o) => time(o.date) >= weekStart && time(o.date) <= now.getTime());
    const byId = new Map(clothes.map((c) => [c.id, c]));

    const rediscovered = new Map<string, ClothingItem>();
    const colors = new Map<string, { name: string; hex: string; count: number }>();
    for (const record of thisWeek) {
        const at = time(record.date);
        for (const id of record.outfitItems) {
            const item = byId.get(id);
            if (!item) continue;
            const c = colors.get(item.color) ?? { name: item.color, hex: item.colorHex, count: 0 };
            c.count += 1;
            colors.set(item.color, c);

            const previous = outfits
                .filter((o) => o !== record && time(o.date) < at && o.outfitItems.includes(id))
                .reduce((max, o) => Math.max(max, time(o.date)), 0);
            const idleSince = previous || time(item.dateAdded);
            if (at - idleSince >= REDISCOVER_DAYS * DAY_MS) rediscovered.set(id, item);
        }
    }

    const topColor = [...colors.values()].sort((a, b) => b.count - a.count)[0] ?? null;
    return {
        outfits: thisWeek.length,
        daysLogged: new Set(thisWeek.map((o) => new Date(o.date).toDateString())).size,
        rediscovered: [...rediscovered.values()],
        topColor,
    };
}

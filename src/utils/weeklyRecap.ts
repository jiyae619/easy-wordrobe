import { startOfWeek } from 'date-fns';
import type { ClothingItem, WearRecord } from '../types';

/** A piece counts as rediscovered when it comes back after this long on the shelf. */
export const REDISCOVER_DAYS = 21;
const DAY_MS = 86_400_000;

export interface WeeklyRecapData {
    outfits: number;
    daysLogged: number;
    /** Pieces worn this week after 3+ weeks unworn (or never worn, owned 3+ weeks), longest wait first. */
    rediscovered: Array<{ item: ClothingItem; idleDays: number }>;
    /** Monday to Sunday: was anything logged that day? */
    loggedDays: boolean[];
    topColor: { name: string; hex: string; count: number } | null;
}

const time = (d: Date | string) => (d instanceof Date ? d : new Date(d)).getTime();

/** This week's (Monday to now) wear summary, computed from the wear log. */
export function computeWeeklyRecap(clothes: ClothingItem[], outfits: WearRecord[], now = new Date()): WeeklyRecapData {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
    const thisWeek = outfits.filter((o) => time(o.date) >= weekStart && time(o.date) <= now.getTime());
    const byId = new Map(clothes.map((c) => [c.id, c]));

    const rediscovered = new Map<string, { item: ClothingItem; idleDays: number }>();
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
            const idleDays = Math.floor((at - idleSince) / DAY_MS);
            if (idleDays >= REDISCOVER_DAYS && idleDays > (rediscovered.get(id)?.idleDays ?? 0)) rediscovered.set(id, { item, idleDays });
        }
    }

    const topColor = [...colors.values()].sort((a, b) => b.count - a.count)[0] ?? null;
    return {
        outfits: thisWeek.length,
        daysLogged: new Set(thisWeek.map((o) => new Date(o.date).toDateString())).size,
        rediscovered: [...rediscovered.values()].sort((a, b) => b.idleDays - a.idleDays),
        loggedDays: Array.from({ length: 7 }, (_, i) => {
            const start = weekStart + i * DAY_MS;
            return thisWeek.some((o) => time(o.date) >= start && time(o.date) < start + DAY_MS);
        }),
        topColor,
    };
}

const MILESTONES: Array<{ days: number; name: string }> = [
    { days: 3, name: '3 days' },
    { days: 7, name: 'a full week' },
    { days: 14, name: 'two weeks' },
    { days: 30, name: 'a month' },
    { days: 60, name: 'two months' },
    { days: 100, name: '100 days' },
];

/** The next streak milestone and how far along the way to it the streak is (0 to 1). */
export function streakGoal(current: number): { target: number; name: string; progress: number; left: number } {
    const next = MILESTONES.find((m) => m.days > current) ?? { days: Math.ceil((current + 1) / 100) * 100, name: `${Math.ceil((current + 1) / 100) * 100} days` };
    return { target: next.days, name: next.name, progress: Math.min(1, current / next.days), left: next.days - current };
}

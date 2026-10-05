/** Streak milestones for the Style Log streak bar. */

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

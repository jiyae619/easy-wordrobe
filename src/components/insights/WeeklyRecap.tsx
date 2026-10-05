import React, { useMemo } from 'react';
import { useWardrobe } from '../../context/WardrobeContext';
import { computeWearStreak } from '../../services/agents/agentOutputGuards';
import { computeWeeklyRecap } from '../../utils/weeklyRecap';
import { itemName } from '../../utils/itemName';

/**
 * A short weekly summary at the top of Stats: outfits logged, pieces brought back after 3+ weeks,
 * the logging streak and the colour worn most. It reads "Week in review" on Sundays.
 */
export const WeeklyRecap: React.FC = () => {
    const { clothes, outfits } = useWardrobe();
    const recap = useMemo(() => computeWeeklyRecap(clothes, outfits), [clothes, outfits]);
    const streak = useMemo(() => computeWearStreak(outfits).current, [outfits]);
    const isSunday = new Date().getDay() === 0;

    if (outfits.length === 0) return null;

    const back = recap.rediscovered[0];
    const line = recap.outfits === 0
        ? 'Nothing logged yet this week. Today is a good day to start.'
        : back
            ? `Nice one: your ${itemName(back).toLowerCase()} is back in rotation.`
            : recap.daysLogged >= 5
                ? 'Five days logged. Your stylist knows you well now.'
                : 'Every look you log makes tomorrow’s picks sharper.';

    const tiles = [
        { label: 'Outfits', value: String(recap.outfits) },
        { label: 'Brought back', value: String(recap.rediscovered.length) },
        { label: 'Streak', value: `${streak}d` },
    ];

    return (
        <section className="rounded-[22px] bg-ink text-paper p-4" aria-label={isSunday ? 'Week in review' : 'Your week so far'}>
            <div className="flex items-baseline justify-between">
                <h2 className="font-display text-lg font-extrabold">{isSunday ? 'Week in review' : 'Your week so far'}</h2>
                {recap.topColor && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-paper/70">
                        <span className="w-3 h-3 rounded-full border border-paper/40" style={{ backgroundColor: recap.topColor.hex }} />
                        Mostly {recap.topColor.name.toLowerCase()}
                    </span>
                )}
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
                {tiles.map((t) => (
                    <div key={t.label} className="rounded-2xl bg-paper/10 px-3 py-2">
                        <p className="font-display text-2xl font-extrabold text-lime leading-none">{t.value}</p>
                        <p className="text-[11px] font-semibold text-paper/70 mt-1">{t.label}</p>
                    </div>
                ))}
            </div>
            <p className="text-sm font-semibold mt-3">{line}</p>
        </section>
    );
};

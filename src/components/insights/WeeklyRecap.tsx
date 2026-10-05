import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Sparkles } from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';
import { computeSeasonalLeastWornIds, computeWearStreak } from '../../services/agents/agentOutputGuards';
import { computeWeeklyRecap, streakGoal } from '../../utils/weeklyRecap';
import { daysIdle } from '../../utils/outfitSlots';
import { itemName } from '../../utils/itemName';
import { GarmentImage } from '../common/GarmentImage';
import type { TodayRouteState } from '../../pages/Today';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * The week at a glance on Style Log: which days got an outfit, the logging streak with the next
 * milestone, and one forgotten gem (a piece back in rotation this week, or the one waiting longest,
 * with "Style it"). It reads "Week in review" on Sundays.
 */
export const WeeklyRecap: React.FC = () => {
    const { clothes, outfits } = useWardrobe();
    const navigate = useNavigate();
    const recap = useMemo(() => computeWeeklyRecap(clothes, outfits), [clothes, outfits]);
    const streak = useMemo(() => computeWearStreak(outfits).current, [outfits]);
    const waiting = useMemo(() => {
        const id = computeSeasonalLeastWornIds(clothes, outfits)[0];
        const item = clothes.find((c) => c.id === id);
        return item ? { item, days: daysIdle(item) } : null;
    }, [clothes, outfits]);

    if (outfits.length === 0) return null;

    const now = new Date();
    const todayIndex = (now.getDay() + 6) % 7;
    const isSunday = todayIndex === 6;
    const goal = streakGoal(streak);
    const back = recap.rediscovered[0];
    const gem = back ? { item: back.item, line: `Back after ${back.idleDays} days. Nice.`, styleable: false }
        : waiting ? { item: waiting.item, line: `${waiting.days} days on the rail.`, styleable: true }
        : null;

    return (
        <section className="rounded-[22px] bg-ink text-paper p-4 space-y-4" aria-label={isSunday ? 'Week in review' : 'Your week so far'}>
            <div className="flex items-baseline justify-between gap-2">
                <h2 className="font-display text-lg font-extrabold">{isSunday ? 'Week in review' : 'Your week so far'}</h2>
                {recap.topColor && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-paper/70">
                        <span className="w-3 h-3 rounded-full border border-paper/40" style={{ backgroundColor: recap.topColor.hex }} />
                        Mostly {recap.topColor.name.toLowerCase()}
                    </span>
                )}
            </div>

            {/* Outfits logged, day by day */}
            <div className="flex items-center gap-3">
                <div className="flex gap-1.5" aria-label={`${recap.daysLogged} of 7 days logged`}>
                    {DAYS.map((d, i) => (
                        <span
                            key={i}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold ${recap.loggedDays[i] ? 'bg-lime text-ink' : i === todayIndex ? 'border-[1.5px] border-lime text-lime' : i < todayIndex ? 'bg-paper/10 text-paper/55' : 'text-paper/40'}`}
                        >
                            {d}
                        </span>
                    ))}
                </div>
                <p className="ml-auto text-right leading-tight">
                    <span className="font-display text-2xl font-extrabold text-lime">{recap.outfits}</span>
                    <span className="block text-[11px] font-semibold text-paper/70">{recap.outfits === 1 ? 'outfit' : 'outfits'}</span>
                </p>
            </div>

            {/* Streak, with the next milestone */}
            <div>
                <div className="flex items-baseline justify-between gap-2">
                    <p className="inline-flex items-center gap-1.5 text-sm font-bold">
                        <Flame className={`w-4 h-4 ${streak > 0 ? 'text-lime fill-lime' : 'text-paper/50'}`} />
                        {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
                    </p>
                    <p className="text-[11px] font-semibold text-paper/60">
                        {streak > 0 ? `${goal.left} more to ${goal.name}` : 'Log today to start one'}
                    </p>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-paper/15 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={goal.target} aria-valuenow={streak}>
                    <div className="h-full rounded-full bg-lime transition-[width] duration-500" style={{ width: `${Math.max(goal.progress * 100, streak > 0 ? 4 : 0)}%` }} />
                </div>
            </div>

            {/* Forgotten gem: the piece itself */}
            {gem && (
                <div className="flex items-center gap-3 rounded-2xl bg-paper/10 p-2.5">
                    <div className="flex-none w-14 h-14 rounded-xl overflow-hidden bg-white">
                        <GarmentImage item={gem.item} className="w-full h-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-lime">Forgotten gem</p>
                        <p className="text-sm font-bold leading-tight line-clamp-2">{itemName(gem.item)}</p>
                        <p className="text-[11px] text-paper/70">{gem.line}</p>
                    </div>
                    {gem.styleable && (
                        <button
                            type="button"
                            onClick={() => navigate('/', { state: { lockItemId: gem.item.id } satisfies TodayRouteState })}
                            className="flex-none h-8 px-3 rounded-full bg-lime text-ink text-xs font-bold inline-flex items-center gap-1"
                        >
                            <Sparkles className="w-3 h-3" /> Style it
                        </button>
                    )}
                </div>
            )}
        </section>
    );
};

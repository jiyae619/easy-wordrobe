import React, { useMemo } from 'react';
import { useWardrobe } from '../../context/WardrobeContext';
import { Star } from 'lucide-react';
import { streakLine } from '../../copy/voice';
import { computeMonthlyRotation, computeWearStreak, getWardrobeReadiness } from '../../services/agents/agentOutputGuards';

/**
 * Gentle gamification: a consecutive-day outfit-logging streak with a "log today to keep it going"
 * nudge, plus a monthly closet-rotation stat. Voice stays a stylist friend, not a game. Hidden until
 * the wardrobe can actually make an outfit (so it doesn't compete with the cold-start prompts).
 */
export const StreakCard: React.FC = () => {
    const { outfits, clothes } = useWardrobe();

    const readiness = useMemo(() => getWardrobeReadiness(clothes), [clothes]);
    const streak = useMemo(() => computeWearStreak(outfits), [outfits]);
    const rotation = useMemo(() => computeMonthlyRotation(clothes, outfits), [clothes, outfits]);

    if (!readiness.canMakeOutfit) return null;

    const { current, loggedToday } = streak;
    const active = current > 0;

    const headline = current > 0 ? `${current} day streak` : 'Start a streak';
    const sub = streakLine(current, loggedToday);

    return (
        <section>
            <div className="rounded-[22px] p-4 bg-white border-[1.5px] border-ink">
                <div className="flex items-center gap-3.5">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-2xl flex-shrink-0 border-[1.5px] border-ink ${active ? 'bg-lime' : 'bg-paper'}`}>
                        <Star className={`w-5 h-5 text-ink ${active ? 'fill-ink' : ''}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-display text-base font-extrabold text-ink">{headline}</p>
                        <p className="text-xs text-ink/60 mt-0.5">{sub}</p>
                    </div>
                    {active && (
                        <div className="text-right flex-shrink-0">
                            <p className="font-display text-[28px] font-extrabold text-ink leading-none">{current}</p>
                            <p className="text-[10px] text-ink/50 uppercase tracking-wide mt-0.5">days</p>
                        </div>
                    )}
                </div>

                {rotation.total > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-ink/10">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-ink/60 font-medium">Closet rotation this month</span>
                            <span className="font-bold text-ink">{rotation.worn}/{rotation.total} pieces</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden mt-2">
                            <div className="h-full bg-ink transition-all duration-300" style={{ width: `${rotation.percent}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

import React, { useMemo } from 'react';
import { useWardrobe } from '../../context/WardrobeContext';
import { Star } from 'lucide-react';
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

    let headline: string;
    let sub: string;
    if (current > 0 && loggedToday) {
        headline = `${current} day streak`;
        sub = current === 1
            ? "You styled today — come back tomorrow to build it."
            : "You're on a roll. Keep it going tomorrow.";
    } else if (current > 0) {
        headline = `${current} day streak`;
        sub = "Log today's outfit to keep it alive.";
    } else {
        headline = "Start a streak";
        sub = "Wear a look today to begin your styling streak.";
    }

    return (
        <section>
            <div className={`rounded-2xl p-5 border ${active ? 'bg-gradient-to-br from-amber-50 to-olive-50 border-amber-200/70' : 'bg-white border-olive-200/70'}`}>
                <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-2xl flex-shrink-0 ${active ? 'bg-amber-100' : 'bg-olive-100'}`}>
                        <Star className={`w-6 h-6 ${active ? 'text-amber-500 fill-amber-400' : 'text-olive-400'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-base font-bold text-primary">{headline}</p>
                        <p className="text-xs text-olive-600 mt-0.5">{sub}</p>
                    </div>
                    {active && (
                        <div className="text-right flex-shrink-0">
                            <p className="text-2xl font-bold text-amber-500 leading-none">{current}</p>
                            <p className="text-[10px] text-olive-400 uppercase tracking-wide mt-0.5">days</p>
                        </div>
                    )}
                </div>

                {rotation.total > 0 && (
                    <div className="mt-4 pt-3 border-t border-amber-200/40">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-olive-600 font-medium">Closet rotation this month</span>
                            <span className="font-bold text-primary">{rotation.worn}/{rotation.total} pieces</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-olive-100 overflow-hidden mt-2">
                            <div className="h-full bg-secondary transition-all duration-300" style={{ width: `${rotation.percent}%` }} />
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

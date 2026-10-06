import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';
import { ClothingCategory } from '../../types';
import { getWardrobeCompleteness } from '../../services/agents/agentOutputGuards';

const PIECES_GOAL = 5;
const DAYS_GOAL = 3;

/**
 * First-week checklist: three small steps, each with a payoff the user can see, so a new closet
 * pays off in the first session. Once done it hands over to the closet-completeness nudge.
 */
export const FirstWeekChecklist: React.FC = () => {
    const { clothes, outfits } = useWardrobe();
    const daysLogged = useMemo(
        () => new Set(outfits.map((o) => new Date(o.date).toDateString())).size,
        [outfits],
    );
    const completeness = getWardrobeCompleteness(clothes);

    if (clothes.length === 0) return null;

    const openPicker = (categories?: ClothingCategory[]) =>
        window.dispatchEvent(new CustomEvent('open-starter-picker', {
            detail: categories && categories.length > 0 ? { categories } : undefined,
        }));
    const openScanner = () => window.dispatchEvent(new CustomEvent('open-scanner'));

    const steps = [
        {
            title: `Add ${PIECES_GOAL} pieces`,
            unlock: 'More pieces, more combos.',
            progress: Math.min(clothes.length, PIECES_GOAL),
            goal: PIECES_GOAL,
            action: <button type="button" onClick={openScanner} className="text-xs font-bold underline underline-offset-2">Scan more</button>,
        },
        {
            title: 'Wear your first look',
            unlock: 'Your stylist learns what you like.',
            progress: Math.min(outfits.length, 1),
            goal: 1,
            action: <span className="text-xs text-ink/60">Swipe right on a look above.</span>,
        },
        {
            title: `Log ${DAYS_GOAL} days`,
            unlock: 'Your Style Log starts to fill in.',
            progress: Math.min(daysLogged, DAYS_GOAL),
            goal: DAYS_GOAL,
            action: <Link to="/insights" className="text-xs font-bold underline underline-offset-2">Log a past day</Link>,
        },
    ];
    const doneCount = steps.filter((s) => s.progress >= s.goal).length;

    if (doneCount === steps.length) {
        // Checklist done: keep nudging toward a fuller closet until it's complete.
        if (!completeness.nextUnlock) return null;
        return (
            <section className="rounded-[22px] bg-white border-[1.5px] border-ink p-4">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-extrabold text-ink">{completeness.stage}</h2>
                    <span className="text-xs font-bold text-ink/60">{Math.round(completeness.ratio * 100)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden mt-2">
                    <div className="h-full bg-ink" style={{ width: `${completeness.ratio * 100}%` }} />
                </div>
                <p className="text-xs text-ink/60 mt-2">{completeness.nextUnlock}.</p>
                <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => openPicker(completeness.nextUnlockKey === 'shoes' ? [ClothingCategory.Shoes] : undefined)} className="flex-1 h-10 rounded-full bg-ink text-paper text-xs font-bold">
                        Pick basics
                    </button>
                    <button type="button" onClick={openScanner} className="flex-1 h-10 rounded-full border-[1.5px] border-ink text-ink text-xs font-bold">
                        Scan an item
                    </button>
                </div>
            </section>
        );
    }

    return (
        <section className="rounded-[22px] bg-white border-[1.5px] border-ink p-4" aria-label="Your first week">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-ink">Your first week</h2>
                <span className="text-xs font-bold text-ink/60">{doneCount}/{steps.length}</span>
            </div>
            <ol className="mt-3 space-y-3">
                {steps.map((s) => {
                    const done = s.progress >= s.goal;
                    return (
                        <li key={s.title} className="flex gap-3">
                            <span className={`flex-none w-6 h-6 rounded-full border-[1.5px] border-ink flex items-center justify-center ${done ? 'bg-lime' : 'bg-paper'}`}>
                                {done && <Check className="w-3.5 h-3.5" />}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                    <p className={`text-sm font-bold ${done ? 'text-ink/45 line-through' : 'text-ink'}`}>{s.title}</p>
                                    {s.goal > 1 && <span className="text-[11px] font-bold text-ink/50">{s.progress}/{s.goal}</span>}
                                </div>
                                {!done && (
                                    <div className="flex items-center justify-between gap-2 mt-0.5">
                                        <p className="text-xs text-ink/60">{s.unlock}</p>
                                        {s.action}
                                    </div>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
};

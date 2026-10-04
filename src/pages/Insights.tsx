import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import { Lightbulb, Sparkles, Loader2 } from 'lucide-react';
import { WeeklyOutfitTimeline } from '../components/insights/WeeklyOutfitTimeline';
import { OutfitHistory } from '../components/insights/OutfitHistory';
import { ExpandableText } from '../components/common/ExpandableText';

const Insights: React.FC = () => {
    const { clothes, insights, fetchInsights, isLoading, addTryItItem, removeTryItItem, tryItItemIds } = useWardrobe();
    const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!insights && clothes.length > 0) {
            fetchInsights();
        }
    }, [clothes.length]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-8 h-8 text-ink animate-spin" />
                <p className="text-ink/60 font-medium">Generating your style insights...</p>
            </div>
        );
    }

    if (clothes.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="font-display text-[34px] font-extrabold leading-none tracking-tight text-ink">
                        Stats
                    </h1>
                    <p className="text-sm text-ink/50 mt-0.5">
                        Understand how you dress and dress smarter.
                    </p>
                </div>
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border-2 border-dashed border-ink/30 text-center">
                    <Lightbulb className="w-12 h-12 text-ink/30 mb-4" />
                    <h3 className="text-lg font-semibold text-ink mb-2">No insights yet</h3>
                    <p className="text-sm text-ink/50 max-w-xs mb-4">
                        Add items to your wardrobe to get personalized style insights.
                    </p>
                </div>
            </div>
        );
    }

    if (!insights) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-8 h-8 text-ink animate-spin" />
                <p className="text-ink/60 font-medium">Generating your style insights...</p>
            </div>
        );
    }

    const handleTryIt = async (itemId: string) => {
        await addTryItItem(itemId);
        setSavedItemIds(prev => new Set(prev).add(itemId));
    };

    const handleUnTryIt = async (itemId: string) => {
        await removeTryItItem(itemId);
        setSavedItemIds(prev => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
        });
    };

    const isSaved = (itemId: string) => savedItemIds.has(itemId) || tryItItemIds.includes(itemId);

    // Top nudge
    const topNudge = insights.suggestedVariations[0] || "Add more items to your wardrobe to get personalized insights!";

    // Top 3 most worn items
    const topWorn = insights.mostWornItems.slice(0, 3);

    // Least worn items for next week suggestions
    const nextWeekItems = insights.leastWornItems.slice(0, 5);

    return (
        <div className="space-y-6 md:space-y-8">

            {/* Header */}
            <div>
                <h1 className="font-display text-[34px] font-extrabold leading-none tracking-tight text-ink">
                    Stats
                </h1>
                <p className="text-sm text-ink/50 mt-0.5">
                    Understand how you dress and dress smarter.
                </p>
            </div>

            {/* Weekly Outfit Timeline */}
            <WeeklyOutfitTimeline />

            {/* Next Week Suggestions + Nudge */}
            {nextWeekItems.length > 0 && (
                <section>
                    <div className="mb-4">
                        <h2 className="font-display text-xl font-extrabold text-ink">Try Next Week</h2>
                        <span className="text-xs text-ink/50 font-medium">Least worn items during the past 3 weeks</span>
                    </div>

                    {/* Behavioral Nudge */}
                    <div className="mb-3 p-4 rounded-[20px] bg-lime border-[1.5px] border-ink">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-paper border-[1.5px] border-ink flex items-center justify-center">
                                <Lightbulb className="w-4 h-4 text-ink" />
                            </div>
                            <div className="pt-1.5">
                                <ExpandableText
                                    text={topNudge}
                                    textClassName="text-sm leading-relaxed text-ink font-medium"
                                    collapsedClassName="line-clamp-2"
                                    minCharsForToggle={110}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {nextWeekItems.slice(0, 3).map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-4 p-3 bg-white rounded-[20px] border-[1.5px] border-ink"
                            >
                                {/* Thumbnail */}
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-paper flex-shrink-0">
                                    <img
                                        src={item.imageUrl}
                                        alt={item.subcategory}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm text-ink truncate capitalize">
                                        {item.subcategory}
                                    </h3>
                                    <p className="text-[11px] text-ink/50 capitalize">
                                        {item.category} • Worn {item.wearFrequency}×
                                    </p>
                                </div>
                                {/* CTA — toggleable */}
                                {isSaved(item.id) ? (
                                    <button
                                        onClick={() => handleUnTryIt(item.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-ink text-lime text-xs font-bold rounded-full transition-colors active:scale-[0.97]"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        Will try
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleTryIt(item.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-paper border-[1.5px] border-ink text-ink text-xs font-bold rounded-full transition-colors active:scale-[0.97]"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        Try it
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Most Worn Leaderboard */}
            <section>
                <div className="mb-4">
                    <h2 className="font-display text-xl font-extrabold text-ink">Most Worn</h2>
                    <span className="text-xs text-ink/50 font-medium">During the past 3 weeks</span>
                </div>

                <div className="space-y-3">
                    {topWorn.length === 0 && (
                        <div className="text-center py-8 px-4">
                            <p className="text-sm text-ink/50 mb-3">
                                Wear and log a look to start your history — your most-worn pieces will show up here.
                            </p>
                            <Link
                                to="/suggest"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-ink text-paper text-xs font-bold rounded-full transition-colors active:scale-[0.97]"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                Style a look
                            </Link>
                        </div>
                    )}
                    {topWorn.map((entry, index) => {
                        const rankColors = ['bg-ink', 'bg-lime border-[1.5px] border-ink', 'bg-white border-[1.5px] border-ink'];
                        const rankTextColors = ['text-lime', 'text-ink', 'text-ink'];
                        return (
                            <div
                                key={entry.item.id}
                                className="flex items-center gap-4 p-3 bg-white rounded-[20px] border-[1.5px] border-ink"
                            >
                                {/* Rank badge */}
                                <div className={`w-8 h-8 rounded-full ${rankColors[index]} flex items-center justify-center flex-shrink-0`}>
                                    <span className={`text-xs font-bold ${rankTextColors[index]}`}>
                                        {index + 1}
                                    </span>
                                </div>
                                {/* Thumbnail */}
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-paper flex-shrink-0">
                                    <img
                                        src={entry.item.imageUrl}
                                        alt={entry.item.subcategory}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* Name + subtitle */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm text-ink truncate capitalize">
                                        {entry.item.subcategory}
                                    </h3>
                                    <p className="text-[11px] text-ink/50 capitalize">
                                        {entry.item.category} • {entry.item.color}
                                    </p>
                                </div>
                                {/* Wear count */}
                                <div className="text-right flex-shrink-0">
                                    <p className="font-display text-xl font-extrabold text-ink">{entry.count}</p>
                                    <p className="text-[10px] text-ink/50 uppercase tracking-wide">wears</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Outfit History + one-tap re-wear */}
            <OutfitHistory />

        </div>
    );
};

export default Insights;

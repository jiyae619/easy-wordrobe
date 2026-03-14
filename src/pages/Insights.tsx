import React, { useEffect, useState } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import { Lightbulb, Sparkles, Loader2 } from 'lucide-react';
import { WeeklyOutfitTimeline } from '../components/insights/WeeklyOutfitTimeline';

const Insights: React.FC = () => {
    const { clothes, insights, fetchInsights, isLoading, addTryItItem, removeTryItItem, tryItItemIds } = useWardrobe();
    const [savedItemIds, setSavedItemIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!insights && clothes.length > 0) {
            fetchInsights();
        }
    }, [clothes.length]);

    if (!insights || isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-olive-600 font-medium">Generating your style insights...</p>
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
                <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                    Style Insights
                </h1>
                <p className="text-sm text-olive-500 mt-0.5">
                    Understand how you dress and dress smarter.
                </p>
            </div>

            {/* Weekly Outfit Timeline */}
            <WeeklyOutfitTimeline />

            {/* Next Week Suggestions + Nudge */}
            {nextWeekItems.length > 0 && (
                <section>
                    <div className="mb-4">
                        <h2 className="text-lg font-bold text-primary">Try Next Week</h2>
                        <span className="text-xs text-olive-400 font-medium">Least worn items</span>
                    </div>

                    {/* Behavioral Nudge */}
                    <div className="mb-3 p-4 rounded-2xl bg-olive-100/50 border border-olive-200/60">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center">
                                <Lightbulb className="w-4 h-4 text-secondary" />
                            </div>
                            <p className="text-sm leading-relaxed text-olive-600 pt-1.5">
                                {topNudge}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {nextWeekItems.slice(0, 3).map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-muted shadow-sm"
                            >
                                {/* Thumbnail */}
                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-olive-50 flex-shrink-0">
                                    <img
                                        src={item.imageUrl}
                                        alt={item.subcategory}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm text-primary truncate capitalize">
                                        {item.subcategory}
                                    </h3>
                                    <p className="text-[11px] text-olive-400 capitalize">
                                        {item.category} • Worn {item.wearFrequency}×
                                    </p>
                                </div>
                                {/* CTA — toggleable */}
                                {isSaved(item.id) ? (
                                    <button
                                        onClick={() => handleUnTryIt(item.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-full transition-colors hover:bg-olive-700 active:scale-[0.97]"
                                    >
                                        <Sparkles className="w-3 h-3" />
                                        Will try
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleTryIt(item.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-olive-100 hover:bg-olive-200 text-secondary text-xs font-semibold rounded-full transition-colors active:scale-[0.97]"
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
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-primary">Most Worn</h2>
                    <span className="text-xs text-olive-400 font-medium">All time</span>
                </div>

                <div className="space-y-3">
                    {topWorn.length === 0 && (
                        <div className="text-center py-8 text-olive-400 text-sm">
                            Wear items to see your leaderboard.
                        </div>
                    )}
                    {topWorn.map((entry, index) => {
                        const rankColors = ['bg-primary', 'bg-olive-500', 'bg-olive-300'];
                        const rankTextColors = ['text-white', 'text-white', 'text-primary'];
                        return (
                            <div
                                key={entry.item.id}
                                className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-muted shadow-sm"
                            >
                                {/* Rank badge */}
                                <div className={`w-8 h-8 rounded-full ${rankColors[index]} flex items-center justify-center flex-shrink-0`}>
                                    <span className={`text-xs font-bold ${rankTextColors[index]}`}>
                                        {index + 1}
                                    </span>
                                </div>
                                {/* Thumbnail */}
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-olive-50 flex-shrink-0">
                                    <img
                                        src={entry.item.imageUrl}
                                        alt={entry.item.subcategory}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {/* Name + subtitle */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-bold text-sm text-primary truncate capitalize">
                                        {entry.item.subcategory}
                                    </h3>
                                    <p className="text-[11px] text-olive-400 capitalize">
                                        {entry.item.category} • {entry.item.color}
                                    </p>
                                </div>
                                {/* Wear count */}
                                <div className="text-right flex-shrink-0">
                                    <p className="text-lg font-bold text-primary">{entry.count}</p>
                                    <p className="text-[10px] text-olive-400 uppercase tracking-wide">wears</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>


        </div>
    );
};

export default Insights;

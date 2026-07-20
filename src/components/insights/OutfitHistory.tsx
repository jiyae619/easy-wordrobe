import React, { useMemo, useState } from 'react';
import { useWardrobe } from '../../context/WardrobeContext';
import { format } from 'date-fns';
import { Shirt, RotateCcw, Check, Heart } from 'lucide-react';
import { MOODS } from '../../data/moods';
import type { ClothingItem, WeatherData } from '../../types';

const HISTORY_LIMIT = 20;
const WEATHER_CACHE_KEY = 'home-weather-cache-v1'; // mirrors Home.tsx

/** Best-effort current weather for a re-wear: prefer this session's cached weather, else fall back. */
function getCachedWeather(): WeatherData | null {
    try {
        const cached = sessionStorage.getItem(WEATHER_CACHE_KEY);
        if (cached) {
            const parsed = JSON.parse(cached) as { weather?: WeatherData };
            return parsed.weather ?? null;
        }
    } catch {
        /* ignore malformed cache */
    }
    return null;
}

function moodName(id: string): string {
    return MOODS.find((m) => m.id === id)?.name ?? id;
}

/**
 * Browsable list of recently worn outfits with a one-tap "Wear again" — turns stored wear history
 * into a re-engagement loop. Re-wearing logs a fresh WearRecord for today (incrementing wear counts),
 * so it feeds right back into insights and the behavioral loop.
 */
export const OutfitHistory: React.FC = () => {
    const { outfits, clothes, logOutfitWear, toggleOutfitFavorite } = useWardrobe();
    const [rewornId, setRewornId] = useState<string | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);

    const itemsById = useMemo(() => new Map(clothes.map((c) => [c.id, c])), [clothes]);

    const records = useMemo(() => {
        return [...outfits]
            .sort((a, b) => {
                // Favorites pinned to the top, then most-recent first.
                if (Boolean(a.favorite) !== Boolean(b.favorite)) return a.favorite ? -1 : 1;
                return new Date(b.date).getTime() - new Date(a.date).getTime();
            })
            .map((record) => ({
                record,
                items: record.outfitItems
                    .map((id) => itemsById.get(id))
                    .filter((i): i is ClothingItem => Boolean(i)),
            }))
            .filter((entry) => entry.items.length > 0)
            .slice(0, HISTORY_LIMIT);
    }, [outfits, itemsById]);

    if (records.length === 0) return null;

    const handleWearAgain = async (record: (typeof records)[number]['record'], items: ClothingItem[]) => {
        if (pendingId) return;
        setPendingId(record.id);
        try {
            const weather = getCachedWeather() ?? record.weather;
            // Re-wear only the items that still exist in the wardrobe.
            await logOutfitWear(items.map((i) => i.id), record.mood, weather);
            setRewornId(record.id);
            window.setTimeout(() => setRewornId(null), 2000);
        } finally {
            setPendingId(null);
        }
    };

    return (
        <section>
            <div className="mb-4">
                <h2 className="text-lg font-bold text-primary">Outfit History</h2>
                <span className="text-xs text-olive-400 font-medium">What you've worn recently</span>
            </div>
            <div className="space-y-3">
                {records.map(({ record, items }) => (
                    <div key={record.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-muted shadow-sm">
                        <div className="flex -space-x-2 flex-shrink-0">
                            {items.slice(0, 3).map((item, j) => (
                                <div key={j} className="w-11 h-11 rounded-xl overflow-hidden border-2 border-white bg-olive-50 flex items-center justify-center">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.subcategory} className="w-full h-full object-cover" />
                                    ) : (
                                        <Shirt className="w-4 h-4 text-olive-300" />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-primary">{format(new Date(record.date), 'EEE, MMM d')}</p>
                            <p className="text-[11px] text-olive-400 capitalize">
                                {moodName(record.mood)} · {items.length} item{items.length === 1 ? '' : 's'}
                            </p>
                        </div>
                        <button
                            onClick={() => toggleOutfitFavorite(record.id)}
                            aria-label={record.favorite ? 'Remove from favorites' : 'Add to favorites'}
                            aria-pressed={Boolean(record.favorite)}
                            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-olive-50 transition-colors active:scale-[0.97] flex-shrink-0"
                        >
                            <Heart className={`w-4 h-4 ${record.favorite ? 'text-red-500 fill-red-500' : 'text-olive-300'}`} />
                        </button>
                        <button
                            onClick={() => handleWearAgain(record, items)}
                            disabled={pendingId === record.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-olive-100 hover:bg-olive-200 text-secondary text-xs font-semibold rounded-full transition-colors active:scale-[0.97] disabled:opacity-50 flex-shrink-0"
                        >
                            {rewornId === record.id ? (
                                <><Check className="w-3 h-3" /> Logged</>
                            ) : (
                                <><RotateCcw className="w-3 h-3" /> Wear again</>
                            )}
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
};

import React, { useState } from 'react';
import { useWardrobe } from '../../context/WardrobeContext';
import { startOfWeek, addDays, isSameDay, format } from 'date-fns';
import { Shirt, X } from 'lucide-react';
import type { ClothingItem } from '../../types';

export const WeeklyOutfitTimeline: React.FC = () => {
    const { outfits, clothes } = useWardrobe();
    const [selectedDayItems, setSelectedDayItems] = useState<{ date: Date, items: ClothingItem[] } | null>(null);

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });

    const days = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(weekStart, i);
        const dayOutfits = outfits.filter(o => isSameDay(new Date(o.date), date));
        const isToday = isSameDay(date, today);

        // Get unique item IDs from all outfits that day
        const itemIds = [...new Set(dayOutfits.flatMap(o => o.outfitItems))];
        const items = itemIds
            .map(id => clothes.find(c => c.id === id))
            .filter(Boolean)
            .slice(0, 3);

        return { date, dayOutfits, isToday, items, dayLabel: format(date, 'EEE'), dayNum: format(date, 'd') };
    });

    return (
        <section>
            <h2 className="font-display text-xl font-extrabold text-ink mb-4">This Week</h2>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
                {days.map((day, i) => (
                    <button
                        key={i}
                        onClick={() => {
                            if (day.items.length > 0) {
                                setSelectedDayItems({ date: day.date, items: day.items as ClothingItem[] });
                            }
                        }}
                        className={`flex-none w-[calc((100%-36px)/7)] min-w-[40px] flex flex-col items-center rounded-2xl py-2 px-1 transition-all ${day.isToday
                            ? 'bg-ink text-lime'
                            : day.dayOutfits.length > 0
                                ? 'bg-lime text-ink border-[1.5px] border-ink active:scale-95 cursor-pointer'
                                : 'bg-white text-ink/40 border-[1.5px] border-ink/15 cursor-default'
                            }`}
                    >
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${day.isToday ? 'text-lime/80' : ''}`}>
                            {day.dayLabel}
                        </span>
                        <span className={`text-sm font-bold my-1 ${day.isToday ? 'text-white' : ''}`}>
                            {day.dayNum}
                        </span>

                        {/* Outfit preview */}
                        {day.items.length > 0 ? (
                            <div className="flex -space-x-1.5 mt-1">
                                {day.items.map((item, j) => (
                                    <div key={j} className="w-5 h-5 rounded-full overflow-hidden border-2 border-white bg-paper">
                                        {item?.imageUrl ? (
                                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Shirt className="w-3 h-3 text-ink/30 m-auto" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-5 h-5 mt-1 flex items-center justify-center">
                                <div className={`w-1.5 h-1.5 rounded-full ${day.isToday ? 'bg-lime' : 'bg-ink/15'}`} />
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Daily Outfit Details Modal */}
            {selectedDayItems && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden animate-scale-in">
                        <div className="flex items-center justify-between p-5 border-b border-ink/10">
                            <div>
                                <h3 className="font-display text-xl font-extrabold text-ink">Outfit Details</h3>
                                <p className="text-sm text-ink/50">{format(selectedDayItems.date, 'EEEE, MMMM d')}</p>
                            </div>
                            <button
                                onClick={() => setSelectedDayItems(null)}
                                className="p-2 text-ink/50 hover:text-ink hover:bg-paper rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 max-h-[60vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-3">
                                {selectedDayItems.items.map((item) => (
                                    <div key={item.id} className="relative rounded-xl overflow-hidden bg-paper aspect-square">
                                        {item.imageUrl ? (
                                            <img
                                                src={item.imageUrl}
                                                alt={item.subcategory}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <Shirt className="w-8 h-8 text-ink/30" />
                                            </div>
                                        )}
                                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                            <p className="text-white text-xs font-medium capitalize truncate">{item.subcategory}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

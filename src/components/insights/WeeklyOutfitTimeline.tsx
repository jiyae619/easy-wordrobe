import React from 'react';
import { useWardrobe } from '../../context/WardrobeContext';
import { startOfWeek, addDays, isSameDay, format } from 'date-fns';
import { Shirt } from 'lucide-react';

export const WeeklyOutfitTimeline: React.FC = () => {
    const { outfits, clothes } = useWardrobe();

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
            <h2 className="text-lg font-bold text-primary mb-4">This Week</h2>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-2">
                {days.map((day, i) => (
                    <div
                        key={i}
                        className={`flex-none w-[calc((100%-48px)/7)] min-w-[52px] flex flex-col items-center rounded-2xl p-2 transition-all ${day.isToday
                                ? 'bg-primary text-white shadow-md'
                                : day.dayOutfits.length > 0
                                    ? 'bg-olive-100 text-primary'
                                    : 'bg-white text-olive-400 border border-muted'
                            }`}
                    >
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${day.isToday ? 'text-olive-200' : ''}`}>
                            {day.dayLabel}
                        </span>
                        <span className={`text-sm font-bold my-1 ${day.isToday ? 'text-white' : ''}`}>
                            {day.dayNum}
                        </span>

                        {/* Outfit preview */}
                        {day.items.length > 0 ? (
                            <div className="flex -space-x-1.5 mt-1">
                                {day.items.map((item, j) => (
                                    <div key={j} className="w-5 h-5 rounded-full overflow-hidden border-2 border-white bg-olive-50">
                                        {item?.imageUrl ? (
                                            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Shirt className="w-3 h-3 text-olive-300 m-auto" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="w-5 h-5 mt-1 flex items-center justify-center">
                                <div className={`w-1.5 h-1.5 rounded-full ${day.isToday ? 'bg-olive-300' : 'bg-olive-200'}`} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </section>
    );
};

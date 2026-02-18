import React from 'react';
import { type WearRecord, type ClothingItem } from '../../types';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { Check } from 'lucide-react';

interface WeeklyTimelineProps {
    history: WearRecord[];
    clothes: ClothingItem[];
    onLogOutfit?: (date: Date) => void;
}

export const WeeklyTimeline: React.FC<WeeklyTimelineProps> = ({ history, clothes }) => {
    const today = new Date();
    const start = startOfWeek(today, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

    return (
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-muted">
            <h3 className="text-lg font-bold text-primary mb-4">This Week</h3>

            <div className="grid grid-cols-7 gap-1 md:gap-2">
                {days.map((day) => {
                    const record = history.find(h => isSameDay(new Date(h.date), day));
                    const dayName = format(day, 'EEE');
                    const dayNum = format(day, 'd');
                    const isToday = isSameDay(day, today);

                    return (
                        <div key={day.toISOString()} className="flex flex-col items-center space-y-2">
                            <span className={`text-xs font-medium ${isToday ? 'text-secondary' : 'text-gray-400'}`}>
                                {dayName}
                            </span>

                            <div
                                className={`
                                    w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center border-2 transition-all
                                    ${record
                                        ? 'border-secondary bg-olive-50'
                                        : isToday
                                            ? 'border-dashed border-secondary/50 bg-olive-50/50'
                                            : 'border-transparent bg-olive-50'
                                    }
                                `}
                            >
                                {record ? (() => {
                                    const item = clothes.find(c => c.id === record.outfitItems[0]);
                                    return item ? (
                                        <img src={item.imageUrl} alt="Outfit" className="w-full h-full object-cover rounded-full p-0.5" />
                                    ) : (
                                        <Check className="w-5 h-5 text-secondary" />
                                    );
                                })() : (
                                    <span className="text-sm text-olive-400">{dayNum}</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

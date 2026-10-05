import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startOfWeek, addDays, addWeeks, isSameDay, isAfter, startOfDay, differenceInCalendarWeeks, format } from 'date-fns';
import { Camera, Check, Plus, Shirt, X } from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';
import type { ClothingItem, WearRecord } from '../../types';
import { itemName } from '../../utils/itemName';
import { outfitKey, loggedKeysOn } from '../../utils/wearLog';
import type { TodayRouteState } from '../../pages/Today';
import { OutfitPhotoLog } from './OutfitPhotoLog';

const MIN_WEEKS = 4;
const MAX_WEEKS = 26;

const Thumb: React.FC<{ item?: ClothingItem; size?: string }> = ({ item, size = 'w-5 h-5' }) => (
    <div className={`${size} rounded-full overflow-hidden border-2 border-white bg-paper flex items-center justify-center`}>
        {item?.imageUrl ? <img src={item.thumbnailUrl || item.imageUrl} alt="" className="w-full h-full object-cover" /> : <Shirt className="w-3 h-3 text-ink/30" />}
    </div>
);

/**
 * The wear calendar on Stats: a horizontally scrolling strip of weeks (newest on the right). Tap any
 * day up to today to see what was worn, and log an outfit for a day you forgot: re-log a recent
 * look in two taps, or build it on Today's rails.
 */
export const WeeklyOutfitTimeline: React.FC = () => {
    const { outfits, clothes, logOutfitWear } = useWardrobe();
    const navigate = useNavigate();
    const scroller = useRef<HTMLDivElement>(null);
    const [openDay, setOpenDay] = useState<Date | null>(null);
    const [weekOffset, setWeekOffset] = useState(0);
    const [pickKey, setPickKey] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [photoLog, setPhotoLog] = useState<{ files: File[]; day: Date | null } | null>(null);
    const photoInput = useRef<HTMLInputElement>(null);
    const batchInput = useRef<HTMLInputElement>(null);

    const today = startOfDay(new Date());
    const thisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const byId = useMemo(() => new Map(clothes.map((c) => [c.id, c])), [clothes]);

    const earliest = outfits.reduce<Date | null>((min, o) => {
        const d = new Date(o.date);
        return !min || d < min ? d : min;
    }, null);
    const span = earliest ? differenceInCalendarWeeks(thisWeek, earliest, { weekStartsOn: 1 }) + 1 : 1;
    const weekCount = Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, span));

    const weeks = Array.from({ length: weekCount }, (_, w) => {
        const start = addWeeks(thisWeek, w - (weekCount - 1));
        return Array.from({ length: 7 }, (_, i) => {
            const date = addDays(start, i);
            const dayOutfits = outfits.filter((o) => isSameDay(new Date(o.date), date));
            const items = [...new Set(dayOutfits.flatMap((o) => o.outfitItems))]
                .map((id) => byId.get(id))
                .filter((i): i is ClothingItem => Boolean(i))
                .slice(0, 3);
            return { date, dayOutfits, items, isToday: isSameDay(date, today), isFuture: isAfter(date, today) };
        });
    });

    // Open on the current week (the right end of the strip).
    useLayoutEffect(() => {
        const el = scroller.current;
        if (el) el.scrollLeft = el.scrollWidth;
    }, [weekCount]);

    const onScroll = () => {
        const el = scroller.current;
        if (!el || el.clientWidth === 0) return;
        const fromEnd = Math.round((el.scrollWidth - el.clientWidth - el.scrollLeft) / el.clientWidth);
        if (fromEnd !== weekOffset) setWeekOffset(fromEnd);
    };

    const weekLabel = weekOffset === 0 ? 'This week' : weekOffset === 1 ? 'Last week'
        : (() => {
            const start = addWeeks(thisWeek, -weekOffset);
            return `${format(start, 'd MMM')} to ${format(addDays(start, 6), 'd MMM')}`;
        })();

    // Recent distinct looks, for two-tap logging of a forgotten day.
    const recentLooks = useMemo(() => {
        const seen = new Set<string>();
        const looks: Array<{ key: string; record: WearRecord; items: ClothingItem[] }> = [];
        for (const record of [...outfits].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())) {
            const items = record.outfitItems.map((id) => byId.get(id)).filter((i): i is ClothingItem => Boolean(i));
            const key = outfitKey(items.map((i) => i.id));
            if (items.length === 0 || seen.has(key)) continue;
            seen.add(key);
            looks.push({ key, record, items });
            if (looks.length === 4) break;
        }
        return looks;
    }, [outfits, byId]);

    const closeDay = () => { setOpenDay(null); setPickKey(null); };
    const day = openDay ? weeks.flat().find((d) => isSameDay(d.date, openDay)) ?? null : null;
    const dayKeys = openDay ? loggedKeysOn(outfits, openDay) : new Set<string>();
    const pick = recentLooks.find((l) => l.key === pickKey) ?? null;

    const logPick = async () => {
        if (!pick || !openDay) return;
        setSaving(true);
        // Midday on that day, so time zones never tip it into the next or previous date.
        const when = new Date(openDay.getFullYear(), openDay.getMonth(), openDay.getDate(), 12);
        await logOutfitWear(pick.items.map((i) => i.id), pick.record.mood, null, day?.isToday ? undefined : when);
        setSaving(false);
        setPickKey(null);
    };

    const buildOnRails = () => {
        if (!openDay) return;
        const state: TodayRouteState | undefined = day?.isToday ? undefined : { logDate: openDay.toISOString() };
        navigate('/', { state });
    };

    return (
        <section>
            <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-xl font-extrabold text-ink">{weekLabel}</h2>
                {/* A batch of old outfit photos: each lands on the day it was taken */}
                <button
                    type="button"
                    onClick={() => batchInput.current?.click()}
                    className="h-8 px-3 rounded-full border-[1.5px] border-ink text-[11px] font-bold inline-flex items-center gap-1.5"
                >
                    <Camera className="w-3.5 h-3.5" /> From photos
                </button>
                <input
                    ref={batchInput}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        e.target.value = '';
                        if (files.length > 0) setPhotoLog({ files, day: null });
                    }}
                />
            </div>
            <div
                ref={scroller}
                onScroll={onScroll}
                className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-1"
            >
                {weeks.map((week, w) => (
                    <div key={w} className="flex-none w-full snap-start grid grid-cols-7 gap-1.5 px-1 pb-1">
                        {week.map((d) => (
                            <button
                                key={d.date.toISOString()}
                                type="button"
                                disabled={d.isFuture}
                                onClick={() => setOpenDay(d.date)}
                                aria-label={`${format(d.date, 'EEEE d MMMM')}${d.dayOutfits.length ? `, ${d.dayOutfits.length} logged` : ', nothing logged'}`}
                                className={`flex flex-col items-center rounded-2xl py-2 px-0.5 transition-transform active:scale-95 disabled:opacity-40 ${d.isToday
                                    ? 'bg-ink text-lime'
                                    : d.dayOutfits.length > 0
                                        ? 'bg-lime text-ink border-[1.5px] border-ink'
                                        : 'bg-white text-ink/50 border-[1.5px] border-ink/15'
                                    }`}
                            >
                                <span className="text-[10px] font-semibold uppercase tracking-wide">{format(d.date, 'EEE')}</span>
                                <span className={`text-sm font-bold my-1 ${d.isToday ? 'text-white' : ''}`}>{format(d.date, 'd')}</span>
                                {d.items.length > 0 ? (
                                    <div className="flex -space-x-1.5 mt-1">
                                        {d.items.map((item) => <Thumb key={item.id} item={item} />)}
                                    </div>
                                ) : (
                                    <div className="w-5 h-5 mt-1 flex items-center justify-center">
                                        {d.isFuture ? <span className="w-1.5 h-1.5 rounded-full bg-ink/15" /> : <Plus className={`w-3.5 h-3.5 ${d.isToday ? 'text-lime' : 'text-ink/35'}`} />}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
            <p className="mt-1.5 text-[11px] text-ink/50 text-center">Swipe for past weeks · tap a day to log it</p>

            {/* Day sheet: what was worn, and log a look for that day */}
            {openDay && day && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={(e) => { if (e.target === e.currentTarget) closeDay(); }}>
                    <div className="w-full max-w-md bg-paper rounded-[28px] border-[1.5px] border-ink overflow-hidden animate-scale-in max-h-[85vh] flex flex-col">
                        <div className="flex items-center justify-between px-5 pt-4 pb-3">
                            <div>
                                <p className="text-[11px] font-bold text-ink/50">{day.isToday ? 'Today' : format(openDay, 'EEEE')}</p>
                                <h3 className="font-display text-xl font-extrabold text-ink">{format(openDay, 'd MMMM')}</h3>
                            </div>
                            <button type="button" onClick={closeDay} aria-label="Close" className="w-8 h-8 rounded-full bg-ink/80 text-white flex items-center justify-center">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
                            {day.dayOutfits.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-ink/45 uppercase tracking-wider">Worn</p>
                                    {day.dayOutfits.map((o) => {
                                        const items = o.outfitItems.map((id) => byId.get(id)).filter((i): i is ClothingItem => Boolean(i));
                                        return (
                                            <div key={o.id} className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-ink/10">
                                                <div className="flex -space-x-2">{items.slice(0, 4).map((i) => <Thumb key={i.id} item={i} size="w-9 h-9" />)}</div>
                                                <p className="text-xs font-semibold text-ink/70 min-w-0 flex-1 truncate">{items.map(itemName).join(', ')}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-ink/45 uppercase tracking-wider">
                                    {day.dayOutfits.length > 0 ? 'Wore something else too?' : day.isToday ? 'Log today’s outfit' : 'Forgot to log it? Add it now'}
                                </p>
                                {recentLooks.map((l) => {
                                    const done = dayKeys.has(l.key);
                                    const on = pickKey === l.key;
                                    return (
                                        <button
                                            key={l.key}
                                            type="button"
                                            disabled={done}
                                            onClick={() => setPickKey(on ? null : l.key)}
                                            aria-pressed={on}
                                            className={`w-full flex items-center gap-3 p-2.5 rounded-2xl border-[1.5px] text-left disabled:opacity-50 ${on ? 'border-ink bg-lime/40' : 'border-ink/10 bg-white'}`}
                                        >
                                            <div className="flex -space-x-2">{l.items.slice(0, 4).map((i) => <Thumb key={i.id} item={i} size="w-9 h-9" />)}</div>
                                            <p className="text-xs font-semibold text-ink/70 min-w-0 flex-1 truncate">{l.items.map(itemName).join(', ')}</p>
                                            {(on || done) && <Check className="w-4 h-4 flex-none" />}
                                        </button>
                                    );
                                })}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => photoInput.current?.click()}
                                        className="h-11 rounded-full bg-lime border-[1.5px] border-ink text-xs font-bold inline-flex items-center justify-center gap-1.5"
                                    >
                                        <Camera className="w-3.5 h-3.5" /> From a photo
                                    </button>
                                    <button
                                        type="button"
                                        onClick={buildOnRails}
                                        className="h-11 rounded-full border-[1.5px] border-dashed border-ink text-xs font-bold"
                                    >
                                        Build it on the rails
                                    </button>
                                </div>
                                <p className="text-[11px] text-ink/50 text-center">Got outfit photos? We’ll spot the pieces and the date.</p>
                                <input
                                    ref={photoInput}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files ?? []);
                                        e.target.value = '';
                                        if (files.length === 0 || !openDay) return;
                                        setPhotoLog({ files, day: openDay });
                                        closeDay();
                                    }}
                                />
                            </div>
                        </div>

                        {pick && (
                            <div className="flex-none border-t border-ink/10 px-4 py-3">
                                <button
                                    type="button"
                                    onClick={() => void logPick()}
                                    disabled={saving}
                                    className="w-full h-11 rounded-full bg-ink text-paper text-sm font-bold disabled:opacity-60"
                                >
                                    {saving ? 'Saving…' : `Log it for ${day.isToday ? 'today' : format(openDay, 'EEE d MMM')}`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {photoLog && (
                <OutfitPhotoLog files={photoLog.files} fallbackDay={photoLog.day} onClose={() => setPhotoLog(null)} />
            )}
        </section>
    );
};

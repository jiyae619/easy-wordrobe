import React from 'react';
import { Plus, Star } from 'lucide-react';
import type { ClothingItem } from '../../types';
import { GarmentImage } from '../common/GarmentImage';
import { itemName } from '../../utils/itemName';

interface ClosetRailProps {
    label: string;
    items: ClothingItem[];
    /** Neglected pieces: id → days idle. */
    dustyDays: Map<string, number>;
    /** Pieces tagged "Wear more". */
    wearMoreIds: Set<string>;
    selectedId: string | null;
    /** Bumped on every tap so the tapped piece swings again. */
    swayKey: number;
    onSelect: (item: ClothingItem) => void;
    onAdd: () => void;
    /** Shoes sit on a shelf instead of hanging from the rail. */
    shelf?: boolean;
    size: number;
}

/**
 * One category as a clothes rail in the Closet's bird's-eye view: every piece hangs side by side
 * and the rail scrolls natively (no virtual windowing needed at closet sizes). Tap a piece to pick
 * it; it swings on its hook.
 */
export const ClosetRail: React.FC<ClosetRailProps> = ({
    label, items, dustyDays, wearMoreIds, selectedId, swayKey, onSelect, onAdd, shelf = false, size,
}) => {
    const hook = shelf ? 0 : 14;
    return (
        <section aria-label={`${label}, ${items.length} ${items.length === 1 ? 'piece' : 'pieces'}`}>
            <div className="flex items-baseline justify-between">
                <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-ink">{label}</h2>
                <span className="text-[11px] font-semibold text-ink/50">{items.length}</span>
            </div>
            <div className="relative -mx-4 mt-1">
                {shelf ? (
                    <div className="absolute left-0 right-0 bottom-[10px] h-[6px] rounded-full bg-walnut/40" aria-hidden="true" />
                ) : (
                    <div className="absolute left-0 right-0 top-[4px] h-[5px] rounded-full bg-walnut" aria-hidden="true" />
                )}
                <div className="relative flex gap-3 overflow-x-auto no-scrollbar px-4 pb-3 snap-x scroll-px-4" style={{ paddingTop: 2 }}>
                    {items.map((item) => {
                        const on = item.id === selectedId;
                        const days = dustyDays.get(item.id);
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => onSelect(item)}
                                aria-pressed={on}
                                aria-label={itemName(item)}
                                className="relative flex-none snap-start"
                                style={{ width: size, height: hook + size }}
                            >
                                <span key={on ? swayKey : 0} className={`absolute inset-0 ${on ? 'hanger-sway' : ''}`}>
                                    {!shelf && (
                                        <svg width="16" height="18" viewBox="0 0 16 18" className="absolute left-1/2 -translate-x-1/2 top-0 text-ink/70" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                                            <path d="M8 18V9.5a3.5 3.5 0 1 1 3.5-3.5" />
                                        </svg>
                                    )}
                                    <span
                                        className={`absolute left-0 rounded-2xl overflow-hidden bg-white transition-shadow ${on ? 'ring-2 ring-ink shadow-[0_0_0_5px_#D4F06A]' : 'ring-1 ring-ink/10 shadow-[0_6px_14px_rgba(21,26,20,0.10)]'}`}
                                        style={{ top: hook, width: size, height: size }}
                                    >
                                        <GarmentImage item={item} className="w-full h-full" />
                                        {days != null && (
                                            <span className="absolute left-1.5 top-1.5 px-1.5 h-[18px] rounded-full bg-ink text-lime text-[10px] font-extrabold flex items-center">{days}d</span>
                                        )}
                                        {wearMoreIds.has(item.id) && (
                                            <span className="absolute right-1.5 top-1.5 w-[18px] h-[18px] rounded-full bg-lime border border-ink flex items-center justify-center" title="Wear more">
                                                <Star className="w-2.5 h-2.5 fill-ink" />
                                            </span>
                                        )}
                                    </span>
                                </span>
                            </button>
                        );
                    })}
                    <button
                        type="button"
                        onClick={onAdd}
                        aria-label={`Add to ${label.toLowerCase()}`}
                        className="relative flex-none snap-start"
                        style={{ width: items.length === 0 ? size * 1.6 : size * 0.8, height: hook + size }}
                    >
                        <span className="absolute left-0 right-0 rounded-2xl border-2 border-dashed border-ink/30 flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-ink/55" style={{ top: hook, height: size }}>
                            <Plus className="w-4 h-4" />
                            {items.length === 0 ? `Add ${label.toLowerCase()}` : 'Add'}
                        </span>
                    </button>
                </div>
            </div>
        </section>
    );
};

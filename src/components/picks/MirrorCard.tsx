import React from 'react';
import { type ClothingItem, type OutfitSuggestion } from '../../types';
import { isStockPhoto } from '../../data/starterCatalog';
import { GarmentImage } from '../common/GarmentImage';
import { slotsFromItems, isDress, type SlotId } from '../../utils/outfitSlots';

interface MirrorCardProps {
    look: OutfitSuggestion;
    index: number;
    total: number;
    /** Short code-derived "because" line, or null. */
    reason: string | null;
    /** Tap a piece in the mirror to swap it for another piece of the same kind. */
    onSwap?: (slot: SlotId) => void;
    canSwap: (slot: SlotId) => boolean;
}

interface Placement { left: number; top: number; width: number; z: number }

/** Where each piece hangs inside the mirror (percent of the glass). */
function placements(slots: Record<SlotId, ClothingItem | null>): Partial<Record<SlotId, Placement>> {
    const dress = isDress(slots.bottom);
    const both = Boolean(slots.layer && slots.top && !dress);
    const out: Partial<Record<SlotId, Placement>> = {};
    if (dress) {
        if (slots.layer) out.layer = { left: 2, top: 3, width: 46, z: 3 };
        out.bottom = { left: slots.layer ? 30 : 20, top: slots.layer ? 14 : 6, width: 60, z: 2 };
    } else {
        if (both) {
            out.top = { left: 46, top: 7, width: 46, z: 1 };
            out.layer = { left: 4, top: 2, width: 54, z: 2 };
        } else if (slots.layer) out.layer = { left: 23, top: 2, width: 54, z: 2 };
        else if (slots.top) out.top = { left: 23, top: 3, width: 54, z: 2 };
        if (slots.bottom) out.bottom = { left: 25, top: 36, width: 50, z: 3 };
    }
    if (slots.shoes) out.shoes = { left: 35, top: 74, width: 30, z: 4 };
    return out;
}

/**
 * One AI look shown in an arched mirror (the Walk-in "mirror" idea) — used as a card in the Picks
 * swipe stack. Pieces are arranged on the body, tap one to swap it; the explanation and the
 * code-computed scores sit underneath.
 */
export const MirrorCard: React.FC<MirrorCardProps> = ({ look, index, total, reason, onSwap, canSwap }) => {
    const ids = slotsFromItems(look.items);
    const byId = new Map(look.items.map((i) => [i.id, i]));
    const slots: Record<SlotId, ClothingItem | null> = {
        layer: ids.layer ? byId.get(ids.layer) ?? null : null,
        top: ids.top ? byId.get(ids.top) ?? null : null,
        bottom: ids.bottom ? byId.get(ids.bottom) ?? null : null,
        shoes: ids.shoes ? byId.get(ids.shoes) ?? null : null,
    };
    const place = placements(slots);

    return (
        <article className="w-full h-full flex flex-col rounded-[30px] bg-white border-2 border-ink overflow-hidden shadow-[0_14px_30px_rgba(21,26,20,0.12)] select-none">
            <header className="flex items-center justify-between px-4 pt-3.5">
                <span className="h-[26px] px-2.5 rounded-full bg-ink text-lime text-[11px] font-extrabold flex items-center tracking-wide">
                    LOOK {index + 1} OF {total}
                </span>
                <span className="text-[11px] font-extrabold text-olive-500 uppercase tracking-wide">{look.mood.name}</span>
            </header>

            <div className="flex-1 min-h-0 flex items-center justify-center px-6 pt-3 pb-2">
                <div className="relative h-full max-w-full aspect-[0.8] rounded-t-[999px] rounded-b-2xl bg-walnut p-[7px] shadow-[0_10px_24px_rgba(60,40,20,0.18)]">
                    <div className="relative w-full h-full rounded-t-[999px] rounded-b-[10px] bg-[#F5F2EB] overflow-hidden">
                        <div className="absolute -left-10 top-0 w-14 h-[140%] bg-white/50 rotate-[24deg] pointer-events-none" />
                        {(Object.keys(place) as SlotId[]).map((slot) => {
                            const item = slots[slot];
                            const p = place[slot];
                            if (!item || !p) return null;
                            const swappable = Boolean(onSwap) && canSwap(slot);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    disabled={!swappable}
                                    onClick={() => onSwap?.(slot)}
                                    aria-label={swappable ? `Swap the ${item.color} ${item.subcategory}` : `${item.color} ${item.subcategory}`}
                                    className={`piece-swing absolute aspect-square p-0 border-0 bg-transparent disabled:cursor-default ${isStockPhoto(item) ? 'mix-blend-multiply' : ''}`}
                                    style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%`, zIndex: p.z, animationDelay: `${p.z * 60}ms` }}
                                >
                                    <GarmentImage item={item} className="w-full h-full" rounded="rounded-xl" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="px-4 pb-4">
                {look.isFallback && (
                    <p className="text-[11px] font-semibold text-amber-700 mb-1">Quick picks — our AI stylist is unavailable right now.</p>
                )}
                {look.explanation && (
                    <p className="font-display font-bold text-[17px] leading-snug text-ink line-clamp-3">{look.explanation}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                    <span className="h-[26px] px-2.5 rounded-full border-[1.5px] border-ink text-[11px] font-extrabold flex items-center">Weather {Math.round(look.weatherMatch)}</span>
                    <span className="h-[26px] px-2.5 rounded-full border-[1.5px] border-ink text-[11px] font-extrabold flex items-center">Rotation {Math.round(look.wearScore)}</span>
                </div>
                {reason && <p className="mt-2 text-[11px] font-semibold text-olive-600">{reason}</p>}
            </div>
        </article>
    );
};

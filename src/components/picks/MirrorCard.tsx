import React, { useLayoutEffect, useRef, useState } from 'react';
import { type ClothingItem, type OutfitSuggestion } from '../../types';
import { GarmentImage } from '../common/GarmentImage';
import { slotsFromItems, SLOT_ORDER, type SlotId } from '../../utils/outfitSlots';
import { itemName } from '../../utils/itemName';

interface MirrorCardProps {
    look: OutfitSuggestion;
    index: number;
    total: number;
    /** Short code-derived "because" line, or null. */
    reason: string | null;
    /** Tap a piece to see it up close (and swap it from there). Only the top card gets this. */
    onInspect?: (slot: SlotId) => void;
}

const GAP = 8;
/** A tile may stretch this much past square in its roomy direction (cover crops the photo's margin). */
const STRETCH = 1.15;
/** Below this tile height the name caption would hide too much of the photo. */
const CAPTION_MIN = 96;

interface PieceTileProps {
    item: ClothingItem;
    width: number;
    height: number;
    /** Swing-in stagger, ms. */
    delay: number;
    onClick?: () => void;
}

const PieceTile: React.FC<PieceTileProps> = ({ item, width, height, delay, onClick }) => {
    const name = itemName(item);
    return (
        <button
            type="button"
            disabled={!onClick}
            onClick={onClick}
            aria-label={onClick ? `See the ${name} up close` : name}
            className="relative flex-none p-0 border-0 bg-transparent rounded-2xl disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            style={{ width, height }}
        >
            <span
                className="piece-swing relative block w-full h-full rounded-2xl overflow-hidden bg-white border-[3px] border-white shadow-[0_6px_14px_rgba(21,26,20,0.16)]"
                style={{ animationDelay: `${delay}ms` }}
            >
                {/* h-full! beats the global unlayered `img { height: auto }`, so tiles taller than wide still fill */}
                <GarmentImage item={item} className="w-full h-full! rounded-[13px]" />
                {height >= CAPTION_MIN && (
                    <span className="absolute left-1.5 right-1.5 bottom-1.5 flex justify-center pointer-events-none">
                        <span className="max-w-full truncate px-2 py-0.5 rounded-full bg-white/90 text-[10px] leading-4 font-extrabold text-ink">{name}</span>
                    </span>
                )}
            </span>
        </button>
    );
};

interface Grid { cols: number; width: number; height: number }

/**
 * The biggest even grid that fits `n` pieces in a w×h box. Garment photos are square, so tiles stay
 * (nearly) square and every piece gets the same size: nothing overlaps, nothing is a thumbnail.
 */
function fitGrid(n: number, w: number, h: number): Grid {
    let best: Grid = { cols: 1, width: 0, height: 0 };
    for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const cw = (w - GAP * (cols - 1)) / cols;
        const ch = (h - GAP * (rows - 1)) / rows;
        const side = Math.min(cw, ch);
        if (side <= 0) continue;
        const width = Math.min(cw, side * STRETCH);
        const height = Math.min(ch, side * STRETCH);
        if (width * height > best.width * best.height) best = { cols, width, height };
    }
    return { ...best, width: Math.floor(best.width), height: Math.floor(best.height) };
}

/**
 * One AI look in the mirror — a card in Today's swipe stack. The pieces hang in an even grid sized
 * to the glass (layer, top, bottom or dress, shoes), each labelled; tap one to see it up close and
 * swap it. The code-computed scores sit on top, the stylist's explanation underneath.
 */
export const MirrorCard: React.FC<MirrorCardProps> = ({ look, index, total, reason, onInspect }) => {
    const ids = slotsFromItems(look.items);
    const byId = new Map(look.items.map((i) => [i.id, i]));
    const pieces = SLOT_ORDER
        .map((slot) => ({ slot, item: ids[slot] ? byId.get(ids[slot]!) : undefined }))
        .filter((p): p is { slot: SlotId; item: ClothingItem } => Boolean(p.item));

    const glassRef = useRef<HTMLDivElement>(null);
    const [box, setBox] = useState<{ w: number; h: number } | null>(null);
    useLayoutEffect(() => {
        const el = glassRef.current;
        if (!el) return;
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setBox((b) => (b && b.w === width && b.h === height ? b : { w: width, h: height }));
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    const grid = box ? fitGrid(pieces.length, box.w, box.h) : null;

    return (
        <article className="w-full h-full flex flex-col rounded-[30px] bg-white border-2 border-ink overflow-hidden shadow-[0_14px_30px_rgba(21,26,20,0.12)] select-none">
            <header className="flex items-center justify-between gap-2 px-3.5 pt-3 [@media(max-height:760px)]:pt-2.5">
                <span className="h-[26px] px-2.5 rounded-full bg-ink text-lime text-[11px] font-extrabold flex items-center tracking-wide whitespace-nowrap">
                    LOOK {index + 1} OF {total}
                </span>
                <span className="flex gap-1.5">
                    <span className="h-[26px] px-2.5 rounded-full border-[1.5px] border-ink text-[11px] font-extrabold flex items-center whitespace-nowrap">Weather {Math.round(look.weatherMatch)}</span>
                    <span className="h-[26px] px-2.5 rounded-full border-[1.5px] border-ink text-[11px] font-extrabold flex items-center whitespace-nowrap">Rotation {Math.round(look.wearScore)}</span>
                </span>
            </header>

            <div className="flex-1 min-h-0 px-3 pt-2.5 pb-2">
                <div className="h-full rounded-t-[56px] rounded-b-[20px] bg-ink p-[5px]">
                    <div className="relative h-full rounded-t-[51px] rounded-b-[15px] bg-paper overflow-hidden px-3 pt-4 pb-3 [@media(max-height:760px)]:pt-3 [@media(max-height:760px)]:pb-2">
                        <div className="absolute -left-10 top-0 w-14 h-[140%] bg-white/60 rotate-[24deg] pointer-events-none" />
                        <div ref={glassRef} className="relative h-full flex items-center justify-center">
                            {grid && (
                                <div className="flex flex-wrap justify-center" style={{ gap: GAP, width: grid.cols * grid.width + (grid.cols - 1) * GAP }}>
                                    {pieces.map(({ slot, item }, i) => (
                                        <PieceTile
                                            key={item.id}
                                            item={item}
                                            width={grid.width}
                                            height={grid.height}
                                            delay={i * 60}
                                            onClick={onInspect ? () => onInspect(slot) : undefined}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 pb-3.5">
                {look.isFallback && (
                    <p className="text-[11px] font-semibold text-amber-700 mb-1">Quick picks while your stylist takes a break.</p>
                )}
                {look.explanation && (
                    <p className="font-display font-bold text-[15px] leading-snug text-ink line-clamp-3 [@media(max-height:760px)]:line-clamp-2">{look.explanation}</p>
                )}
                {reason && <p className="mt-1.5 text-[11px] font-semibold text-ink/60 truncate [@media(max-height:760px)]:hidden">{reason}</p>}
            </div>
        </article>
    );
};

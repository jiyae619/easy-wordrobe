import React, { useEffect, useRef } from 'react';
import { Sparkles, X } from 'lucide-react';
import { type ClothingItem } from '../../types';
import { GarmentImage } from '../common/GarmentImage';
import { itemName } from '../../utils/itemName';
import { wornLine } from '../../copy/voice';

interface PieceSheetProps {
    /** The piece currently in the look. */
    item: ClothingItem;
    /** Eyebrow, e.g. "Top" or "Dress". */
    label: string;
    /** Same-kind pieces it can be swapped for, the current one included. */
    alternatives: ClothingItem[];
    /** The stylist's original choice for this slot, marked in the strip. */
    stylistPickId: string | null;
    onPick: (id: string) => void;
    onClose: () => void;
}

/**
 * A piece from a look, up close: the photo big enough to recognise, its name and wear count, and —
 * when the closet has others of the same kind — a strip to swap it. Tapping a piece in the mirror
 * opens this instead of silently cycling it, so nothing in the look changes unless the user picks.
 */
export const PieceSheet: React.FC<PieceSheetProps> = ({ item, label, alternatives, stylistPickId, onPick, onClose }) => {
    const doneRef = useRef<HTMLButtonElement>(null);
    const selectedRef = useRef<HTMLButtonElement>(null);
    const canSwap = alternatives.length > 1;

    useEffect(() => {
        doneRef.current?.focus({ preventScroll: true });
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Keep the piece in the look visible in the strip.
    useEffect(() => {
        selectedRef.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }, [item.id]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-[2px]"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`${label}: ${itemName(item)}`}
                className="w-full max-w-[480px] max-h-[92dvh] overflow-y-auto rounded-t-[28px] bg-paper border-[1.5px] border-b-0 border-ink px-4 pt-4 animate-fade-in-up"
                style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink/50">{label}</p>
                        <h2 className="font-display text-[22px] leading-tight font-extrabold text-ink">{itemName(item)}</h2>
                        <p className="text-xs text-ink/60 mt-0.5">{wornLine(item)}</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="flex-none w-9 h-9 -mr-1 rounded-full text-ink/60 hover:bg-ink/5 flex items-center justify-center">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mt-3 mx-auto aspect-square w-full max-w-[min(100%,48dvh)] rounded-[22px] overflow-hidden bg-white border-[1.5px] border-ink">
                    <GarmentImage key={item.id} item={item} className="w-full h-full! animate-scale-in" />
                </div>

                {canSwap && (
                    <div className="mt-4">
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink/50 mb-2">Swap it for</p>
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 py-1">
                            {alternatives.map((alt) => {
                                const selected = alt.id === item.id;
                                return (
                                    <button
                                        key={alt.id}
                                        ref={selected ? selectedRef : undefined}
                                        type="button"
                                        onClick={() => onPick(alt.id)}
                                        aria-pressed={selected}
                                        aria-label={`${itemName(alt)}${alt.id === stylistPickId ? ' (stylist’s pick)' : ''}`}
                                        className={`relative flex-none w-[68px] h-[68px] rounded-2xl overflow-hidden bg-white border-2 transition-transform active:scale-95 ${selected ? 'border-ink ring-[3px] ring-lime' : 'border-ink/15'}`}
                                    >
                                        <GarmentImage item={alt} className="w-full h-full!" />
                                        {alt.id === stylistPickId && (
                                            <span className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full bg-ink text-lime flex items-center justify-center" aria-hidden="true">
                                                <Sparkles className="w-2.5 h-2.5" />
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <button ref={doneRef} type="button" onClick={onClose} className="mt-4 w-full h-12 rounded-full bg-ink text-paper text-sm font-bold active:scale-[0.98]">
                    {canSwap && item.id !== stylistPickId ? 'Use this one' : 'Done'}
                </button>
            </div>
        </div>
    );
};

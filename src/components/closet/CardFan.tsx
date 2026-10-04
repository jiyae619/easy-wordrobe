import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type ClothingItem } from '../../types';
import { Plus } from 'lucide-react';
import { GarmentImage } from '../common/GarmentImage';
import { clamp, haptic, prefersReducedMotion } from '../../utils/motion';

interface CardFanProps {
    /** Deck name, shown on the deck's back card at the start of the hand. */
    label: string;
    items: ClothingItem[];
    /** The "add a piece" card at the end of the hand. */
    onAdd: () => void;
    dustyDays: Map<string, number>;
    /** Tap on the focused (raised) card. */
    onOpen: (item: ClothingItem) => void;
    /** The raised card changed. */
    onFocus: (item: ClothingItem) => void;
    /** Smaller cards for short screens. */
    compact?: boolean;
}

/** Degrees between neighbouring cards in the fan. */
const STEP = 10;
const CARD = { w: 186, h: 250 };
const CARD_COMPACT = { w: 146, h: 196 };
/** The fan pivots around a point far below the cards, like a hand of cards. */
const PIVOT = 720;
/** Cards rendered on each side of the focused one — the rest are virtualized away. */
const WINDOW = 5;

/**
 * One category of the closet as a fanned hand of cards. Drag sideways to sweep through the fan;
 * the card at the top is raised and focused. The hand is bookended by the deck's back card on
 * the left and an "add a piece" card on the right, so it reads balanced at either end. Cards deal
 * in from the deck when the hand changes.
 * Rotation is written to the DOM from one rAF loop that sleeps when settled — React re-renders
 * only when the focused card changes.
 */
export const CardFan: React.FC<CardFanProps> = memo(function CardFan({ label, items, dustyDays, onOpen, onAdd, onFocus, compact = false }) {
    const n = items.length;
    const viewRef = useRef<HTMLDivElement>(null);
    const nodes = useRef(new Map<number, HTMLElement>());
    const [focus, setFocus] = useState(0);
    const focusRef = useRef(0);
    const onFocusRef = useRef(onFocus);
    const tickRef = useRef<(t: number) => void>(() => {});
    const ph = useRef({
        off: 0, target: 0, drag: false, raf: 0, last: 0, vel: 0, lx: 0, lt: 0,
        down: null as null | { x: number; y: number; off0: number },
        suppressClick: false,
    });

    const apply = useCallback(() => {
        const p = ph.current;
        nodes.current.forEach((el, i) => {
            const a = i * STEP - p.off;
            const d = Math.abs(a) / STEP;
            const lift = d < 0.5 ? -22 * (1 - d * 2) : 0;
            el.style.transform = `rotate(${a.toFixed(2)}deg) translate3d(0, ${lift.toFixed(1)}px, 0) scale(${(1 - Math.min(d, 3) * 0.03).toFixed(3)})`;
            el.style.zIndex = String(100 - Math.round(d * 10));
            el.style.opacity = String(clamp(1 - (d - 3.5), 0, 1));
        });
        const f = clamp(Math.round(p.off / STEP), 0, Math.max(0, n - 1));
        if (f !== focusRef.current) {
            focusRef.current = f;
            setFocus(f);
        }
    }, [n]);

    const tick = useCallback((t: number) => {
        const p = ph.current;
        const dt = Math.min(48, t - p.last) / 16.67;
        p.last = t;
        if (!p.drag) {
            p.off += (p.target - p.off) * Math.min(1, 0.16 * dt);
            if (Math.abs(p.target - p.off) < 0.02) p.off = p.target;
        }
        apply();
        if (p.drag || p.off !== p.target) p.raf = requestAnimationFrame((t2) => tickRef.current(t2));
        else p.raf = 0;
    }, [apply]);

    const kick = useCallback(() => {
        const p = ph.current;
        if (prefersReducedMotion() && !p.drag) {
            p.off = p.target;
            apply();
            return;
        }
        if (!p.raf) {
            p.last = performance.now();
            p.raf = requestAnimationFrame((t2) => tickRef.current(t2));
        }
    }, [apply]);

    useLayoutEffect(() => {
        tickRef.current = tick;
        onFocusRef.current = onFocus;
        apply();
    });

    useEffect(() => {
        const p = ph.current;
        return () => cancelAnimationFrame(p.raf);
    }, []);

    useEffect(() => {
        if (items[focus]) onFocusRef.current(items[focus]);
    }, [focus, items]);

    const goTo = (i: number) => {
        const next = clamp(i, 0, n - 1);
        if (next !== focusRef.current) haptic(8);
        ph.current.target = next * STEP;
        kick();
    };

    const onPointerDown = (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        ph.current.down = { x: e.clientX, y: e.clientY, off0: ph.current.off };
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const p = ph.current;
        if (!p.down) return;
        const dx = e.clientX - p.down.x;
        const dy = e.clientY - p.down.y;
        if (!p.drag) {
            if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
                p.drag = true;
                viewRef.current?.setPointerCapture(e.pointerId);
                p.lx = p.off;
                p.lt = performance.now();
                p.vel = 0;
                kick();
            } else if (Math.abs(dy) > 10) {
                p.down = null;
            }
            return;
        }
        const max = (n - 1) * STEP;
        let off = p.down.off0 - dx * 0.16;
        if (off < 0) off *= 0.35;
        if (off > max) off = max + (off - max) * 0.35;
        const now = performance.now();
        const dtm = now - p.lt;
        if (dtm > 0) p.vel = p.vel * 0.6 + ((off - p.lx) / dtm) * 0.4;
        p.lx = off;
        p.lt = now;
        p.off = off;
    };

    const endDrag = () => {
        const p = ph.current;
        if (p.drag) {
            p.drag = false;
            p.suppressClick = true;
            window.setTimeout(() => { p.suppressClick = false; }, 60);
            goTo(Math.round((p.off + p.vel * 220) / STEP));
        }
        p.down = null;
    };

    const onCardClick = (i: number) => {
        if (ph.current.suppressClick) return;
        if (i === focusRef.current) onOpen(items[i]);
        else goTo(i);
    };

    const register = (i: number) => (el: HTMLElement | null) => {
        if (el) nodes.current.set(i, el);
        else nodes.current.delete(i);
    };

    // Indices -1 (deck back) and n (add card) are the bookends around the real cards.
    const visible: number[] = [];
    for (let i = Math.max(-1, focus - WINDOW); i <= Math.min(n, focus + WINDOW); i++) visible.push(i);

    const { w: CARD_W, h: CARD_H } = compact ? CARD_COMPACT : CARD;
    const cardStyle = { width: CARD_W, height: CARD_H, marginLeft: -CARD_W / 2, transformOrigin: `50% ${PIVOT}px` };
    const cardClass = 'absolute left-1/2 top-5 p-0 border-0 bg-transparent will-change-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink rounded-[22px]';

    return (
        <div
            ref={viewRef}
            className="relative isolate h-full overflow-hidden select-none cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'pan-y' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
        >
            {visible.map((i) => {
                if (i === -1) {
                    return (
                        <button key="deck-back" ref={register(i)} type="button" onClick={() => { if (!ph.current.suppressClick) goTo(0); }} aria-label={`${label} deck, ${n} cards`} className={cardClass} style={cardStyle}>
                            <span className="deal-in flex w-full h-full rounded-[22px] bg-ink border-2 border-ink p-2.5">
                                {/* Text sits bottom-left: the only part not covered by the raised card. */}
                                <span className="flex flex-col justify-end items-start w-full h-full rounded-[16px] border-[1.5px] border-lime/60 p-3 text-left">
                                    <span className="font-display text-[20px] font-extrabold text-lime leading-none">{label}</span>
                                    <span className="text-[11px] font-bold text-paper/70 mt-1">{n} {n === 1 ? 'card' : 'cards'}</span>
                                </span>
                            </span>
                        </button>
                    );
                }
                if (i === n) {
                    return (
                        <button key="add" ref={register(i)} type="button" onClick={() => { if (!ph.current.suppressClick) onAdd(); }} aria-label="Add a piece" className={cardClass} style={cardStyle}>
                            <span className="deal-in flex flex-col items-center justify-center gap-2 w-full h-full rounded-[22px] bg-paper border-2 border-dashed border-ink/40 text-ink" style={{ animationDelay: `${Math.abs(i - focus) * 45}ms` }}>
                                <span className="w-11 h-11 rounded-full bg-lime border-[1.5px] border-ink flex items-center justify-center"><Plus className="w-5 h-5" /></span>
                                <span className="text-xs font-extrabold">Add a piece</span>
                            </span>
                        </button>
                    );
                }
                const item = items[i];
                const days = dustyDays.get(item.id);
                const isFocus = i === focus;
                return (
                    <button
                        key={item.id}
                        ref={register(i)}
                        type="button"
                        onClick={() => onCardClick(i)}
                        aria-label={isFocus ? `Open ${item.color} ${item.subcategory}` : `Show ${item.color} ${item.subcategory}`}
                        className={cardClass}
                        style={cardStyle}
                    >
                        <span
                            className={`deal-in flex flex-col w-full h-full rounded-[22px] bg-white overflow-hidden border-2 shadow-[0_10px_24px_rgba(21,26,20,0.12)] ${isFocus ? 'border-ink' : 'border-ink/15'}`}
                            style={{ animationDelay: `${Math.abs(i - focus) * 45}ms` }}
                        >
                            <span className="relative flex-none" style={{ height: CARD_W - 4 }}>
                                <GarmentImage item={item} className="w-full h-full" />
                                {days != null && (
                                    <span className="absolute left-2 top-2 px-1.5 h-[18px] rounded-full bg-ink text-lime text-[10px] font-extrabold flex items-center">{days}d</span>
                                )}
                            </span>
                            <span className={`flex-1 min-h-0 flex flex-col justify-center gap-0.5 px-3 py-1 border-t-[1.5px] ${isFocus ? 'bg-lime border-ink' : 'bg-white border-ink/15'}`}>
                                <span className="text-[12px] font-extrabold text-ink leading-tight">{item.subcategory}</span>
                                <span className="text-[10px] font-semibold text-ink/60 leading-tight">{item.color} · worn {item.wearFrequency}×</span>
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
});

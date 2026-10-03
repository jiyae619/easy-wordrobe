import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type ClothingItem } from '../../types';
import { isStockPhoto } from '../../data/starterCatalog';
import { GarmentImage } from '../common/GarmentImage';
import { clamp, haptic, prefersReducedMotion } from '../../utils/motion';

interface CardFanProps {
    items: ClothingItem[];
    dustyDays: Map<string, number>;
    /** Tap on the focused (raised) card. */
    onOpen: (item: ClothingItem) => void;
    /** The raised card changed. */
    onFocus: (item: ClothingItem) => void;
}

/** Degrees between neighbouring cards in the fan. */
const STEP = 10;
const CARD_W = 164;
const CARD_H = 222;
/** The fan pivots around a point far below the cards, like a hand of cards. */
const PIVOT = 720;
/** Cards rendered on each side of the focused one — the rest are virtualized away. */
const WINDOW = 5;

/**
 * One category of the closet as a fanned hand of cards. Drag sideways to sweep through the fan;
 * the card at the top is raised and focused. Cards deal in from the deck when the hand changes.
 * Rotation is written to the DOM from one rAF loop that sleeps when settled — React re-renders
 * only when the focused card changes.
 */
export const CardFan: React.FC<CardFanProps> = memo(function CardFan({ items, dustyDays, onOpen, onFocus }) {
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

    const visible: number[] = [];
    for (let i = Math.max(0, focus - WINDOW); i <= Math.min(n - 1, focus + WINDOW); i++) visible.push(i);

    return (
        <div
            ref={viewRef}
            className="relative h-full overflow-hidden select-none cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'pan-y' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
        >
            {visible.map((i) => {
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
                        className="absolute left-1/2 top-10 p-0 border-0 bg-transparent will-change-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink rounded-[22px]"
                        style={{ width: CARD_W, height: CARD_H, marginLeft: -CARD_W / 2, transformOrigin: `50% ${PIVOT}px` }}
                    >
                        <span
                            className="deal-in flex flex-col w-full h-full rounded-[22px] bg-white overflow-hidden border-2 shadow-[0_10px_24px_rgba(21,26,20,0.12)]"
                            style={{ borderColor: isFocus ? '#151A14' : '#D9D6CB', animationDelay: `${Math.abs(i - focus) * 45}ms` }}
                        >
                            <span className={`relative flex-none flex items-center justify-center ${isStockPhoto(item) ? 'p-1.5' : ''}`} style={{ height: CARD_W - 4 }}>
                                <GarmentImage item={item} className="w-full h-full" rounded="rounded-none" />
                                {days != null && (
                                    <span className="absolute left-2 top-2 px-1.5 h-[18px] rounded-full bg-ink text-lime text-[10px] font-extrabold flex items-center">{days}d</span>
                                )}
                            </span>
                            <span className={`flex-1 flex items-center justify-between gap-1 px-2.5 border-t-[1.5px] border-ink ${isFocus ? 'bg-lime' : 'bg-white'}`}>
                                <span className="text-[11px] font-extrabold text-ink truncate">{item.subcategory}</span>
                                <span className="text-[10px] font-extrabold text-ink flex-none">{item.wearFrequency}×</span>
                            </span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
});

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { type ClothingItem } from '../../types';
import { isStockPhoto } from '../../data/starterCatalog';
import { GarmentImage } from '../common/GarmentImage';
import { haptic, prefersReducedMotion } from '../../utils/motion';
import { wrapIndex } from '../../utils/outfitSlots';

export interface OutfitReelHandle {
    /** Spin to an option index like a slot-machine reel (several turns, ease-out landing). */
    spinTo: (index: number, opts?: { delay?: number; duration?: number; turns?: number }) => void;
}

interface OutfitReelProps {
    label: string;
    options: Array<ClothingItem | null>;
    initialIndex: number;
    /** Called when the reel settles on a new option. */
    onSettle: (index: number) => void;
    /** Called on the first touch, so the page knows the user took over. */
    onInteract?: () => void;
    locked: boolean;
    onToggleLock: () => void;
    /** Dimmed when the slot does not apply (e.g. no top under a dress). */
    dimmed?: boolean;
    noneLabel: string;
    dustyDays: Map<string, number>;
    size: number;
}

const POOL = [-3, -2, -1, 0, 1, 2, 3];

/**
 * An infinite, swipeable reel of options for one outfit slot. Only seven card nodes exist no
 * matter how many items the slot has; positions are written to the DOM each frame and React
 * re-renders only when the centred option changes.
 */
export const OutfitReel = forwardRef<OutfitReelHandle, OutfitReelProps>(function OutfitReel(
    { label, options, initialIndex, onSettle, onInteract, locked, onToggleLock, dimmed = false, noneLabel, dustyDays, size },
    ref,
) {
    const n = options.length;
    const sp = size + 18;
    const viewRef = useRef<HTMLDivElement>(null);
    const poolRef = useRef<HTMLDivElement>(null);
    const slotEls = useRef<Array<HTMLDivElement | null>>([]);
    const [center, setCenter] = useState(initialIndex);
    const renderedCenter = useRef(initialIndex);
    const [wobble, setWobble] = useState(0);
    const onSettleRef = useRef(onSettle);
    const tickRef = useRef<(t: number) => void>(() => {});

    const ph = useRef({
        x: -initialIndex * sp, target: -initialIndex * sp, lastX: -initialIndex * sp, mv: 0,
        drag: false, raf: 0, last: 0, width: 360, vel: 0, lx: 0, lt: 0,
        down: null as null | { x: number; y: number; x0: number },
        spin: null as null | { from: number; to: number; t0: number; dur: number },
        settled: initialIndex,
    });

    const apply = useCallback(() => {
        const p = ph.current;
        const c = -p.x / sp;
        const base = renderedCenter.current;
        const cx = p.width / 2;
        slotEls.current.forEach((el, k) => {
            if (!el) return;
            const pos = (base + POOL[k] - c) * sp;
            const d = Math.abs(pos) / sp;
            el.style.transform = `translate3d(${(cx - size / 2 + pos).toFixed(1)}px,0,0) scale(${(1 - Math.min(d, 1.5) * 0.14).toFixed(3)})`;
            el.style.opacity = String(Math.max(0, 1 - Math.min(d, 2) * 0.33));
            el.style.zIndex = String(100 - Math.round(d * 10));
        });
        if (poolRef.current) {
            const blur = Math.min(3, Math.abs(p.mv) / 10);
            poolRef.current.style.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : '';
        }
        const nextCenter = Math.round(c);
        if (nextCenter !== renderedCenter.current) setCenter(nextCenter);
    }, [sp, size]);

    const settle = useCallback(() => {
        const p = ph.current;
        const idx = wrapIndex(Math.round(-p.x / sp), n);
        if (idx !== p.settled) {
            p.settled = idx;
            onSettleRef.current(idx);
        }
    }, [n, sp]);

    const tick = useCallback((t: number) => {
        const p = ph.current;
        const dt = Math.min(48, t - p.last) / 16.67;
        p.last = t;
        if (p.spin) {
            const u = Math.max(0, Math.min(1, (t - p.spin.t0) / p.spin.dur));
            const e = 1 - Math.pow(1 - u, 4);
            p.x = p.spin.from + (p.spin.to - p.spin.from) * e;
            if (u >= 1) {
                p.x = p.target = p.spin.to;
                p.spin = null;
                haptic(12);
            }
        } else if (!p.drag) {
            p.x += (p.target - p.x) * Math.min(1, 0.16 * dt);
            if (Math.abs(p.target - p.x) < 0.2) p.x = p.target;
        }
        const v = (p.x - p.lastX) / Math.max(dt, 0.001);
        p.lastX = p.x;
        p.mv = v;
        apply();
        if (p.drag || p.spin || Math.abs(v) > 0.01 || p.x !== p.target) {
            p.raf = requestAnimationFrame((t2) => tickRef.current(t2));
        } else {
            p.raf = 0;
            p.mv = 0;
            apply();
            settle();
        }
    }, [apply, settle]);

    const kick = useCallback(() => {
        const p = ph.current;
        if (!p.raf) {
            p.last = performance.now();
            p.raf = requestAnimationFrame((t2) => tickRef.current(t2));
        }
    }, []);

    useLayoutEffect(() => {
        tickRef.current = tick;
        onSettleRef.current = onSettle;
    });

    useImperativeHandle(ref, () => ({
        spinTo: (index, opts = {}) => {
            const p = ph.current;
            if (n === 0) return;
            const cur = Math.round(-p.x / sp);
            const delta = wrapIndex(index - wrapIndex(cur, n), n);
            if (prefersReducedMotion() || n === 1) {
                p.spin = null;
                p.x = p.target = p.lastX = -(cur + delta) * sp;
                apply();
                settle();
                return;
            }
            const steps = (opts.turns ?? 2) * n + delta;
            p.drag = false;
            p.spin = { from: p.x, to: -(cur + steps) * sp, t0: performance.now() + (opts.delay ?? 0), dur: opts.duration ?? 1000 };
            kick();
        },
    }), [n, sp, apply, settle, kick]);

    useLayoutEffect(() => {
        renderedCenter.current = center;
        apply();
    }, [center, apply]);

    useEffect(() => {
        const view = viewRef.current;
        if (!view) return;
        const ro = new ResizeObserver(() => {
            ph.current.width = view.clientWidth;
            apply();
        });
        ro.observe(view);
        return () => ro.disconnect();
    }, [apply]);

    useEffect(() => {
        const p = ph.current;
        return () => cancelAnimationFrame(p.raf);
    }, []);

    const onPointerDown = (e: React.PointerEvent) => {
        if (n < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
        const p = ph.current;
        if (p.spin) return;
        p.width = viewRef.current?.clientWidth ?? p.width;
        p.down = { x: e.clientX, y: e.clientY, x0: p.x };
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
                p.lx = p.x;
                p.lt = performance.now();
                p.vel = 0;
                onInteract?.();
                kick();
            } else if (Math.abs(dy) > 10) {
                p.down = null;
            }
            return;
        }
        const x = p.down.x0 + dx;
        const now = performance.now();
        const dtm = now - p.lt;
        if (dtm > 0) p.vel = p.vel * 0.6 + ((x - p.lx) / dtm) * 0.4;
        p.lx = x;
        p.lt = now;
        p.x = x;
    };

    const endDrag = () => {
        const p = ph.current;
        if (p.drag) {
            p.drag = false;
            p.target = -Math.round(-(p.x + p.vel * 260) / sp) * sp;
            haptic(8);
            kick();
        }
        p.down = null;
    };

    const step = (dir: 1 | -1) => {
        const p = ph.current;
        if (n < 2 || p.spin) return;
        onInteract?.();
        p.target = -(Math.round(-p.target / sp) + dir) * sp;
        kick();
    };

    const current = n > 0 ? options[wrapIndex(center, n)] : undefined;

    return (
        <div className={`relative transition-opacity duration-300 ${dimmed ? 'opacity-35' : ''}`} style={{ height: size + 16 }}>
            <div
                ref={viewRef}
                role="group"
                aria-roledescription="reel"
                aria-label={`${label}: ${current ? `${current.color} ${current.subcategory}` : noneLabel}`}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') step(1);
                    if (e.key === 'ArrowLeft') step(-1);
                }}
                className="absolute inset-0 overflow-hidden select-none cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-ink rounded-3xl"
                style={{ touchAction: 'pan-y' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
            >
                <div ref={poolRef} className="absolute inset-0">
                    {n > 0 && POOL.map((k, slot) => {
                        if (n < POOL.length && Math.abs(k) > Math.floor(n / 2) + 1) {
                            // Small reels: don't render far duplicates of the same few items.
                            return <div key={slot} ref={(el) => { slotEls.current[slot] = el; }} className="hidden" />;
                        }
                        const option = options[wrapIndex(center + k, n)];
                        const days = option ? dustyDays.get(option.id) : undefined;
                        return (
                            <div
                                key={slot}
                                ref={(el) => { slotEls.current[slot] = el; }}
                                className="absolute left-0 will-change-transform"
                                style={{ top: 8, width: size, height: size }}
                            >
                                {option ? (
                                    <div className={`w-full h-full rounded-[22px] bg-white shadow-[0_6px_14px_rgba(21,26,20,0.08)] overflow-hidden flex items-center justify-center ${isStockPhoto(option) ? 'p-1' : ''}`}>
                                        <GarmentImage item={option} className={isStockPhoto(option) ? 'w-[92%] h-[92%]' : 'w-full h-full'} rounded="rounded-[22px]" />
                                    </div>
                                ) : (
                                    <div className="w-full h-full rounded-[22px] border-2 border-dashed border-olive-400 flex items-center justify-center text-[11px] font-bold text-olive-500 text-center px-2">
                                        {noneLabel}
                                    </div>
                                )}
                                {days != null && (
                                    <span className="absolute left-1.5 top-1.5 px-1.5 h-[18px] rounded-full bg-ink text-lime text-[10px] font-extrabold flex items-center">
                                        {days}d
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <span className="absolute left-0 top-0 text-[10px] font-extrabold tracking-[0.12em] uppercase text-olive-600 pointer-events-none z-[110]">
                {label}
            </span>
            <button
                type="button"
                onClick={() => { setWobble((w) => w + 1); haptic(10); onToggleLock(); }}
                aria-pressed={locked}
                aria-label={`${locked ? 'Unlock' : 'Lock'} ${label.toLowerCase()}`}
                className={`absolute right-0 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full border-2 border-ink flex items-center justify-center z-[110] transition-colors ${locked ? 'bg-ink text-lime' : 'bg-paper text-ink'}`}
            >
                <span key={wobble} className={wobble ? 'lock-wobble flex' : 'flex'}>
                    {locked ? <Lock className="w-[18px] h-[18px]" /> : <LockOpen className="w-[18px] h-[18px]" />}
                </span>
            </button>
        </div>
    );
});

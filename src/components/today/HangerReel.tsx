import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { type ClothingItem } from '../../types';
import { GarmentImage } from '../common/GarmentImage';
import { clamp, haptic, prefersReducedMotion } from '../../utils/motion';
import { wrapIndex } from '../../utils/outfitSlots';

export interface HangerReelHandle {
    /** Spin the rail to an option index like a slot machine (several turns, ease-out landing). */
    spinTo: (index: number, opts?: { delay?: number; duration?: number; turns?: number }) => void;
}

interface HangerReelProps {
    label: string;
    options: Array<ClothingItem | null>;
    initialIndex: number;
    /** Called when the rail settles on a new option. */
    onSettle: (index: number) => void;
    /** Called on the first touch, so the page knows the user took over. */
    onInteract?: () => void;
    locked: boolean;
    onToggleLock: () => void;
    /** Dimmed when the slot does not apply (e.g. no top under a dress). */
    dimmed?: boolean;
    noneLabel: string;
    dustyDays: Map<string, number>;
    /** Garment box size in px. */
    size: number;
    /** Shoes sit on a shelf instead of hanging from the rail. */
    shelf?: boolean;
    /** Width of the page's centre "fitting spot"; the label and lock sit on its edges. */
    spotWidth: number;
}

const POOL = [-3, -2, -1, 0, 1, 2, 3];

/**
 * One outfit slot as an endless clothes rail. Swipe it (or Spin it) and the garments slide along
 * the rail and swing on their hooks with the rail's speed — a damped spring, so they keep swaying
 * a moment after landing. Only seven garment nodes exist however many pieces the slot has; motion
 * is written to the DOM from one rAF loop that sleeps when everything is still, and React
 * re-renders only when the centred piece changes.
 */
export const HangerReel = forwardRef<HangerReelHandle, HangerReelProps>(function HangerReel(
    { label, options, initialIndex, onSettle, onInteract, locked, onToggleLock, dimmed = false, noneLabel, dustyDays, size, shelf = false, spotWidth },
    ref,
) {
    const n = options.length;
    // Wide spacing keeps the neighbours clear of the label/lock tabs on the spot's edges.
    const sp = size + 34;
    const HOOK = 14;
    const rowHeight = size + (shelf ? 20 : HOOK + 16);
    const viewRef = useRef<HTMLDivElement>(null);
    const slotEls = useRef<Array<HTMLDivElement | null>>([]);
    const [center, setCenter] = useState(initialIndex);
    const renderedCenter = useRef(initialIndex);
    const [wobble, setWobble] = useState(0);
    const onSettleRef = useRef(onSettle);
    const dimmedRef = useRef(dimmed);
    const tickRef = useRef<(t: number) => void>(() => {});

    const ph = useRef({
        x: -initialIndex * sp, target: -initialIndex * sp, lastX: -initialIndex * sp, mv: 0,
        swing: 0, sv: 0,
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
        const blur = Math.min(2.5, Math.abs(p.mv) / 12);
        const dimFactor = dimmedRef.current ? 0.3 : 1;
        slotEls.current.forEach((el, k) => {
            if (!el) return;
            const pos = (base + POOL[k] - c) * sp;
            const d = Math.abs(pos) / sp;
            const angle = shelf ? 0 : p.swing * (0.75 + (((base + POOL[k]) * 37 % 7 + 7) % 7) / 14);
            el.style.transform = `translate3d(${(cx - size / 2 + pos).toFixed(1)}px,0,0) rotate(${angle.toFixed(2)}deg) scale(${(1 - Math.min(d, 1.5) * 0.12).toFixed(3)})`;
            el.style.opacity = String(Math.max(0, 1 - Math.min(d, 2) * 0.32) * dimFactor);
            el.style.zIndex = String(100 - Math.round(d * 10));
            el.style.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : '';
        });
        const nextCenter = Math.round(c);
        if (nextCenter !== renderedCenter.current) setCenter(nextCenter);
    }, [sp, size, shelf]);

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
            const u = clamp((t - p.spin.t0) / p.spin.dur, 0, 1);
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
        p.mv = p.mv * 0.5 + v * 0.5;
        if (!shelf && !prefersReducedMotion()) {
            // Garments lag behind the rail's motion and sway back: a damped spring on their hooks.
            const drive = clamp(-p.mv * 0.9, -18, 18);
            p.sv += ((drive - p.swing) * 0.05 - p.sv * 0.09) * dt;
            p.swing += p.sv * dt;
        }
        apply();
        const moving = p.drag || p.spin || Math.abs(v) > 0.01 || p.x !== p.target || Math.abs(p.sv) > 0.004 || Math.abs(p.swing) > 0.03;
        if (moving) {
            p.raf = requestAnimationFrame((t2) => tickRef.current(t2));
        } else {
            p.raf = 0;
            p.mv = 0;
            p.swing = 0;
            p.sv = 0;
            apply();
        }
        if (!p.drag && !p.spin && p.x === p.target) settle();
    }, [apply, settle, shelf]);

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
        dimmedRef.current = dimmed;
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
    }, [center, apply, dimmed]);

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
                p.down = null; // vertical page scroll wins
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
    const tileTop = shelf ? 4 : 8 + HOOK;

    return (
        <div className="relative" style={{ height: rowHeight }}>
            <div
                ref={viewRef}
                role="group"
                aria-roledescription="rail"
                aria-label={`${label}: ${current ? `${current.color} ${current.subcategory}` : noneLabel}`}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowRight') step(1);
                    if (e.key === 'ArrowLeft') step(-1);
                }}
                className="absolute inset-0 -mx-4 overflow-hidden select-none cursor-grab active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-ink"
                style={{ touchAction: 'pan-y' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
            >
                {shelf ? (
                    <div className="absolute left-0 right-0 bottom-[8px] h-[6px] rounded-full bg-walnut/40" aria-hidden="true" />
                ) : (
                    <div className="absolute left-0 right-0 top-[8px] h-[5px] rounded-full bg-walnut" aria-hidden="true" />
                )}
                {n > 0 && POOL.map((k, slot) => {
                    if (n < POOL.length && Math.abs(k) > Math.floor(n / 2) + 1) {
                        // Small rails: don't draw far duplicates of the same few pieces.
                        return <div key={slot} ref={(el) => { slotEls.current[slot] = el; }} className="hidden" />;
                    }
                    const option = options[wrapIndex(center + k, n)];
                    const days = option ? dustyDays.get(option.id) : undefined;
                    return (
                        <div
                            key={slot}
                            ref={(el) => { slotEls.current[slot] = el; }}
                            className="absolute left-0 top-0 will-change-transform"
                            style={{ width: size, height: tileTop + size, transformOrigin: '50% 10px' }}
                        >
                            {!shelf && (
                                <svg width="16" height={HOOK + 4} viewBox="0 0 16 18" className="absolute left-1/2 -translate-x-1/2 top-[3px] text-ink/70" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                                    <path d="M8 18V9.5a3.5 3.5 0 1 1 3.5-3.5" />
                                </svg>
                            )}
                            {option ? (
                                <div className="absolute left-0 rounded-2xl overflow-hidden bg-white ring-1 ring-ink/10 shadow-[0_6px_14px_rgba(21,26,20,0.10)]" style={{ top: tileTop, width: size, height: size }}>
                                    <GarmentImage item={option} className="w-full h-full" />
                                    {days != null && (
                                        <span className="absolute left-1.5 top-1.5 px-1.5 h-[18px] rounded-full bg-ink text-lime text-[10px] font-extrabold flex items-center">{days}d</span>
                                    )}
                                </div>
                            ) : (
                                <div className="absolute left-0 rounded-2xl border-2 border-dashed border-ink/25 flex items-center justify-center text-[11px] font-bold text-ink/50 text-center px-2" style={{ top: tileTop, width: size, height: size }}>
                                    {noneLabel}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* The lock sits as a tab on the right edge of the centre spot. */}
            <button
                type="button"
                disabled={dimmed || n === 0}
                onClick={() => { setWobble((w) => w + 1); haptic(10); onToggleLock(); }}
                aria-pressed={locked}
                aria-label={`${locked ? 'Unlock' : 'Lock'} ${label.toLowerCase()}`}
                className="absolute top-1/2 z-[110] w-11 h-11 flex items-center justify-center disabled:opacity-0"
                style={{ left: `calc(50% + ${spotWidth / 2}px)`, transform: 'translate(-50%, -50%)', marginTop: shelf ? 0 : HOOK / 2 }}
            >
                <span className={`w-8 h-8 rounded-full border-[1.5px] border-ink flex items-center justify-center transition-colors ${locked ? 'bg-ink text-lime' : 'bg-paper text-ink'}`}>
                    <span key={wobble} className={wobble ? 'lock-wobble flex' : 'flex'}>
                        {locked ? <Lock className="w-3.5 h-3.5" /> : <LockOpen className="w-3.5 h-3.5" />}
                    </span>
                </span>
            </button>
        </div>
    );
});

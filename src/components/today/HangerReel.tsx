import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { Lock, LockOpen } from 'lucide-react';
import { type ClothingItem } from '../../types';
import { isStockPhoto } from '../../data/starterCatalog';
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
    { label, options, initialIndex, onSettle, onInteract, locked, onToggleLock, dimmed = false, noneLabel, dustyDays, size, shelf = false },
    ref,
) {
    const n = options.length;
    const sp = size + 14;
    const rowHeight = size + (shelf ? 26 : 22);
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
            el.style.opacity = String(Math.max(0, 1 - Math.min(d, 2) * 0.3) * dimFactor);
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
    const top = shelf ? 4 : 10;

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
                    <div className="absolute left-0 right-0 bottom-[6px] h-2 bg-[#CBBFA9] border-t-[3px] border-[#B4A68C]" aria-hidden="true" />
                ) : (
                    <div className="absolute left-0 right-0 top-[9px] h-[6px] rounded-full bg-walnut shadow-[0_3px_0_rgba(60,40,20,0.15)]" aria-hidden="true" />
                )}
                {n > 0 && POOL.map((k, slot) => {
                    if (n < POOL.length && Math.abs(k) > Math.floor(n / 2) + 1) {
                        // Small rails: don't draw far duplicates of the same few pieces.
                        return <div key={slot} ref={(el) => { slotEls.current[slot] = el; }} className="hidden" />;
                    }
                    const option = options[wrapIndex(center + k, n)];
                    const days = option ? dustyDays.get(option.id) : undefined;
                    const stock = option ? isStockPhoto(option) : false;
                    return (
                        <div
                            key={slot}
                            ref={(el) => { slotEls.current[slot] = el; }}
                            className={`absolute left-0 will-change-transform ${stock && !shelf ? 'mix-blend-multiply' : ''}`}
                            style={{ top, width: size, height: size + (shelf ? 0 : 6), transformOrigin: '50% 2px' }}
                        >
                            {!option ? (
                                <div className={`w-full ${shelf ? 'h-full' : 'h-[calc(100%-14px)] mt-[14px]'} rounded-2xl border-2 border-dashed border-olive-400 flex items-center justify-center text-[11px] font-bold text-olive-500 text-center px-2`}>
                                    {noneLabel}
                                </div>
                            ) : shelf ? (
                                <div className="w-full h-full rounded-2xl bg-white/90 shadow-sm overflow-hidden p-1">
                                    <GarmentImage item={option} className="w-full h-full" rounded="rounded-xl" />
                                </div>
                            ) : stock ? (
                                <GarmentImage item={option} className="w-full h-full" />
                            ) : (
                                <div className="flex flex-col items-center w-full h-full">
                                    <svg width="50" height="20" viewBox="0 0 56 22" className="text-ink/70 flex-none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M25 6a3 3 0 1 1 3 3v3L5 20h46L28 12" />
                                    </svg>
                                    <GarmentImage item={option} className="w-[82%] flex-1 min-h-0 -mt-1" rounded="rounded-xl" />
                                </div>
                            )}
                            {days != null && (
                                <span className={`${shelf ? '' : 'dust-tag'} absolute top-3 right-1 flex flex-col items-center pointer-events-none`}>
                                    {!shelf && <span className="block w-px h-3 bg-ink/60" />}
                                    <span className="px-1.5 py-0.5 rounded bg-ink text-lime text-[10px] font-extrabold leading-none">{days}d</span>
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
            <span className="absolute left-0 top-[18px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-olive-600 pointer-events-none z-[110] bg-paper/80 rounded px-0.5">
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

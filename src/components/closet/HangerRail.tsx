import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { type ClothingItem } from '../../types';
import { isStockPhoto } from '../../data/starterCatalog';
import { GarmentImage } from '../common/GarmentImage';
import { clamp, haptic, prefersReducedMotion } from '../../utils/motion';

interface HangerRailProps {
    label: string;
    items: ClothingItem[];
    /** Dusty (neglected) items → days idle, shown as a swinging tag. */
    dustyDays: Map<string, number>;
    /** Shoes sit on a shelf in cubbies instead of hanging. */
    shelf?: boolean;
    /** Tap on the centred piece. */
    onOpen: (item: ClothingItem) => void;
    /** The centred piece of the rail the user is interacting with. */
    onFocus: (item: ClothingItem) => void;
}

const HANG = { w: 104, h: 116, sp: 92 };
const SHELF = { w: 76, h: 76, sp: 86 };
/** Items rendered on each side of the centre — the rest are virtualized away. */
const WINDOW = 4;

/**
 * A horizontal clothes rail. Drag to slide it; garments swing on their hooks with the rail's
 * velocity (a damped spring), the centre piece is emphasized, and a release snaps to the nearest
 * piece with velocity projection. Motion is written straight to the DOM from one rAF loop that
 * stops as soon as everything settles — React only re-renders when the centred piece changes.
 */
export const HangerRail: React.FC<HangerRailProps> = memo(function HangerRail({ label, items, dustyDays, shelf = false, onOpen, onFocus }) {
    const dims = shelf ? SHELF : HANG;
    const n = items.length;
    const viewRef = useRef<HTMLDivElement>(null);
    const nodes = useRef(new Map<number, HTMLElement>());
    const [center, setCenter] = useState(0);
    const centerRef = useRef(0);
    const touched = useRef(false);
    const onFocusRef = useRef(onFocus);
    const tickRef = useRef<(t: number) => void>(() => {});

    const ph = useRef({
        x: 0, target: 0, lastX: 0, mv: 0, swing: 0, sv: 0, vel: 0,
        drag: false, raf: 0, last: 0, width: 360,
        down: null as null | { x: number; y: number; x0: number; t: number },
        lx: 0, lt: 0, suppressClick: false,
    });

    const apply = useCallback(() => {
        const p = ph.current;
        const cx = p.width / 2;
        nodes.current.forEach((el, i) => {
            const d = (i * dims.sp + p.x) / dims.sp;
            const ad = Math.min(Math.abs(d), 2.5);
            const scale = 1 - ad * 0.07;
            const angle = shelf ? 0 : p.swing * (0.75 + ((i * 37) % 7) / 14);
            el.style.transform = `translate3d(${(cx - dims.w / 2 + i * dims.sp + p.x).toFixed(1)}px,0,0) rotate(${angle.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
            el.style.zIndex = String(100 - Math.round(ad * 10));
        });
        const c = clamp(Math.round(-p.x / dims.sp), 0, Math.max(0, n - 1));
        if (c !== centerRef.current) {
            centerRef.current = c;
            setCenter(c);
        }
    }, [dims, shelf, n]);

    const tick = useCallback((t: number) => {
        const p = ph.current;
        const dt = Math.min(48, t - p.last) / 16.67;
        p.last = t;
        if (!p.drag) {
            p.x += (p.target - p.x) * Math.min(1, 0.14 * dt);
            if (Math.abs(p.target - p.x) < 0.2) p.x = p.target;
        }
        const v = (p.x - p.lastX) / Math.max(dt, 0.001);
        p.lastX = p.x;
        p.mv = p.mv * 0.5 + v * 0.5;
        if (!shelf && !prefersReducedMotion()) {
            const drive = clamp(-p.mv * 1.1, -16, 16);
            p.sv += ((drive - p.swing) * 0.05 - p.sv * 0.09) * dt;
            p.swing += p.sv * dt;
        }
        apply();
        const moving = p.drag || Math.abs(v) > 0.01 || Math.abs(p.sv) > 0.004 || Math.abs(p.swing) > 0.03 || p.x !== p.target;
        if (moving) {
            p.raf = requestAnimationFrame((t2) => tickRef.current(t2));
        } else {
            p.raf = 0;
            p.swing = 0;
            p.sv = 0;
            apply();
        }
    }, [apply, shelf]);

    const kick = useCallback(() => {
        const p = ph.current;
        if (prefersReducedMotion() && !p.drag) {
            p.x = p.target;
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
    });

    // Keep transforms in sync after every render (virtualized nodes mount/unmount on centre change).
    useLayoutEffect(() => { apply(); });

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

    useEffect(() => () => cancelAnimationFrame(ph.current.raf), []);

    useEffect(() => {
        if (touched.current && items[center]) onFocusRef.current(items[center]);
    }, [center, items]);

    const goTo = (i: number) => {
        ph.current.target = -clamp(i, 0, n - 1) * dims.sp;
        kick();
    };

    const onPointerDown = (e: React.PointerEvent) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const p = ph.current;
        p.width = viewRef.current?.clientWidth ?? p.width;
        p.down = { x: e.clientX, y: e.clientY, x0: p.x, t: performance.now() };
        touched.current = true;
        if (items[centerRef.current]) onFocusRef.current(items[centerRef.current]);
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
                kick();
            } else if (Math.abs(dy) > 10) {
                p.down = null; // vertical scroll wins
            }
            return;
        }
        const min = -(n - 1) * dims.sp;
        let x = p.down.x0 + dx;
        if (x > 0) x *= 0.35;
        if (x < min) x = min + (x - min) * 0.35;
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
            p.suppressClick = true;
            window.setTimeout(() => { p.suppressClick = false; }, 60);
            const idx = Math.round(-(p.x + p.vel * 240) / dims.sp);
            if (clamp(idx, 0, n - 1) !== centerRef.current) haptic(8);
            goTo(idx);
        }
        p.down = null;
    };

    const onItemClick = (i: number) => {
        if (ph.current.suppressClick) return;
        touched.current = true;
        if (i === centerRef.current) onOpen(items[i]);
        else goTo(i);
    };

    const start = Math.max(0, center - WINDOW);
    const end = Math.min(n - 1, center + WINDOW);
    const visible: number[] = [];
    for (let i = start; i <= end; i++) visible.push(i);

    const register = (i: number) => (el: HTMLElement | null) => {
        if (el) nodes.current.set(i, el);
        else nodes.current.delete(i);
    };

    return (
        <section aria-label={`${label} rail`} className="rail-in">
            <div className="flex items-baseline justify-between px-1">
                <h2 className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-ink">{label}</h2>
                <span className="text-[11px] text-olive-500">
                    {n} {n === 1 ? 'piece' : 'pieces'}
                    {(() => {
                        const dusty = items.filter((i) => dustyDays.has(i.id)).length;
                        return dusty > 0 ? ` · ${dusty} dusty` : '';
                    })()}
                </span>
            </div>
            <div
                ref={viewRef}
                className="relative -mx-4 mt-1 overflow-hidden select-none cursor-grab active:cursor-grabbing bg-paper"
                style={{ height: dims.h + (shelf ? 22 : 12), touchAction: 'pan-y' }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
            >
                {shelf ? (
                    <div className="absolute -left-2 -right-2 bottom-2 h-2.5 bg-[#CBBFA9] border-t-[3px] border-[#B4A68C]" />
                ) : (
                    <div className="absolute -left-2 -right-2 top-[6px] h-[6px] rounded-full bg-walnut shadow-[0_3px_0_rgba(60,40,20,0.15)]" />
                )}
                {visible.map((i) => {
                    const item = items[i];
                    const stock = isStockPhoto(item);
                    const days = dustyDays.get(item.id);
                    const isCenter = i === center;
                    return (
                        <button
                            key={item.id}
                            ref={register(i)}
                            type="button"
                            onClick={() => onItemClick(i)}
                            aria-label={isCenter ? `Open ${item.color} ${item.subcategory}` : `Show ${item.color} ${item.subcategory}`}
                            className={`absolute left-0 top-0 p-0 border-0 bg-transparent will-change-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink rounded-xl ${stock ? 'mix-blend-multiply' : ''}`}
                            style={{ width: dims.w, height: dims.h, transformOrigin: '50% 6px', top: shelf ? 6 : 2 }}
                        >
                            {shelf ? (
                                <span className="block w-full h-full rounded-2xl bg-white/90 shadow-sm overflow-hidden p-1">
                                    <GarmentImage item={item} className="w-full h-full" rounded="rounded-xl" />
                                </span>
                            ) : stock ? (
                                <GarmentImage item={item} className="w-full h-[104px]" />
                            ) : (
                                <span className="flex flex-col items-center w-full h-full">
                                    <svg width="56" height="22" viewBox="0 0 56 22" className="text-ink/70 flex-none" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M25 6a3 3 0 1 1 3 3v3L5 20h46L28 12" />
                                    </svg>
                                    <GarmentImage item={item} className="w-[84px] h-[90px] -mt-1" rounded="rounded-xl" />
                                </span>
                            )}
                            {days != null && (
                                <span className="dust-tag absolute top-3 right-1 flex flex-col items-center pointer-events-none">
                                    <span className="block w-px h-3 bg-ink/60" />
                                    <span className="px-1.5 py-0.5 rounded bg-ink text-lime text-[10px] font-extrabold leading-none">{days}d</span>
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </section>
    );
});

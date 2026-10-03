import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { clamp, haptic, prefersReducedMotion } from '../../utils/motion';

export type SwipeDir = 'right' | 'left' | 'up';

export interface SwipeDeckHandle {
    swipe: (dir: SwipeDir) => void;
}

interface SwipeDeckProps {
    /** Top card first. Only the first three are rendered. */
    cards: Array<{ key: string; node: React.ReactNode }>;
    onSwipe: (key: string, dir: SwipeDir) => void;
    stamps: Record<SwipeDir, string>;
}

const THRESHOLD_X = 110;
const THRESHOLD_UP = 120;

/**
 * A Tinder-style stack: drag the top card right / left / up past a threshold to decide, or use the
 * imperative `swipe()` from buttons. Drag motion is written straight to the card's style (no React
 * re-render per frame); the cards underneath settle into place with a CSS transition.
 */
export const SwipeDeck = forwardRef<SwipeDeckHandle, SwipeDeckProps>(function SwipeDeck({ cards, onSwipe, stamps }, ref) {
    const topRef = useRef<HTMLDivElement>(null);
    const stampRefs = useRef<Partial<Record<SwipeDir, HTMLDivElement | null>>>({});
    const st = useRef({
        down: null as null | { x: number; y: number },
        drag: false, dx: 0, dy: 0, flying: false, suppressClick: false,
    });
    const topKey = cards[0]?.key;

    const paint = () => {
        const el = topRef.current;
        const s = st.current;
        if (!el) return;
        const rot = prefersReducedMotion() ? 0 : s.dx * 0.05;
        el.style.transform = `translate3d(${s.dx}px, ${s.dy}px, 0) rotate(${rot}deg)`;
        const set = (dir: SwipeDir, v: number) => {
            const stamp = stampRefs.current[dir];
            if (stamp) stamp.style.opacity = String(clamp(v, 0, 1));
        };
        set('right', s.dx / 100);
        set('left', -s.dx / 100);
        set('up', -s.dy / THRESHOLD_UP - Math.abs(s.dx) / 300);
    };

    const fly = (dir: SwipeDir) => {
        const s = st.current;
        const el = topRef.current;
        const key = topKey;
        if (s.flying || !el || !key) return;
        s.flying = true;
        haptic(15);
        const reduced = prefersReducedMotion();
        const dur = reduced ? 150 : 320;
        if (dir === 'right') { s.dx = 560; s.dy += 60; }
        if (dir === 'left') { s.dx = -560; s.dy += 60; }
        if (dir === 'up') { s.dy = -900; }
        el.style.transition = `transform ${dur}ms cubic-bezier(.4,0,1,1), opacity ${dur}ms`;
        if (reduced) el.style.opacity = '0';
        paint();
        window.setTimeout(() => {
            s.flying = false;
            s.dx = 0;
            s.dy = 0;
            onSwipe(key, dir);
        }, dur);
    };

    useImperativeHandle(ref, () => ({ swipe: fly }));

    const onPointerDown = (e: React.PointerEvent) => {
        if (st.current.flying || (e.pointerType === 'mouse' && e.button !== 0)) return;
        st.current.down = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: React.PointerEvent) => {
        const s = st.current;
        if (!s.down) return;
        const dx = e.clientX - s.down.x;
        const dy = e.clientY - s.down.y;
        if (!s.drag) {
            if (Math.hypot(dx, dy) < 8) return;
            s.drag = true;
            topRef.current?.setPointerCapture(e.pointerId);
            if (topRef.current) topRef.current.style.transition = 'none';
        }
        s.dx = dx;
        s.dy = Math.min(dy, 80);
        paint();
    };

    const onPointerUp = () => {
        const s = st.current;
        s.down = null;
        if (!s.drag) return;
        s.drag = false;
        s.suppressClick = true;
        window.setTimeout(() => { s.suppressClick = false; }, 60);
        if (s.dx > THRESHOLD_X) return fly('right');
        if (s.dx < -THRESHOLD_X) return fly('left');
        if (s.dy < -THRESHOLD_UP) return fly('up');
        s.dx = 0;
        s.dy = 0;
        if (topRef.current) topRef.current.style.transition = 'transform 0.35s cubic-bezier(.2,.8,.2,1)';
        paint();
    };

    const visible = cards.slice(0, 3);

    return (
        <div className="relative w-full h-full">
            {visible.map((card, depth) => {
                const isTop = depth === 0;
                return (
                    <div
                        key={card.key}
                        ref={isTop ? topRef : undefined}
                        className={`absolute inset-0 will-change-transform ${isTop ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
                        style={{
                            zIndex: 10 - depth,
                            transform: isTop ? 'translate3d(0, 0, 0)' : `translate3d(0, ${depth * 14}px, 0) scale(${1 - depth * 0.05})`,
                            transition: 'transform 0.35s cubic-bezier(.2,.8,.2,1)',
                            transformOrigin: '50% 100%',
                            touchAction: isTop ? 'none' : undefined,
                        }}
                        aria-hidden={isTop ? undefined : true}
                        onPointerDown={isTop ? onPointerDown : undefined}
                        onPointerMove={isTop ? onPointerMove : undefined}
                        onPointerUp={isTop ? onPointerUp : undefined}
                        onPointerCancel={isTop ? onPointerUp : undefined}
                        onClickCapture={isTop ? (e) => {
                            if (st.current.suppressClick) { e.stopPropagation(); e.preventDefault(); }
                        } : undefined}
                    >
                        {card.node}
                        {isTop && (
                            <>
                                <div ref={(el) => { stampRefs.current.right = el; }} className="absolute left-5 top-16 px-3.5 py-1.5 rounded-xl border-[3px] border-ink bg-lime font-display font-extrabold text-2xl text-ink -rotate-12 opacity-0 pointer-events-none z-20">
                                    {stamps.right}
                                </div>
                                <div ref={(el) => { stampRefs.current.left = el; }} className="absolute right-5 top-16 px-3.5 py-1.5 rounded-xl border-[3px] border-ink bg-white font-display font-extrabold text-2xl text-ink rotate-12 opacity-0 pointer-events-none z-20">
                                    {stamps.left}
                                </div>
                                <div ref={(el) => { stampRefs.current.up = el; }} className="absolute left-1/2 top-1/3 -translate-x-1/2 px-4 py-1.5 rounded-xl border-[3px] border-ink bg-ink font-display font-extrabold text-2xl text-lime opacity-0 pointer-events-none z-20 whitespace-nowrap">
                                    {stamps.up}
                                </div>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
});

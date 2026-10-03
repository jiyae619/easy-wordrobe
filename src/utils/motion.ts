/** Small helpers shared by the gesture-driven components (rails, reels, swipe deck). */

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

/** A short haptic tick where supported (Android Chrome). Never the only feedback. */
export function haptic(ms = 10): void {
    try {
        // Browsers block vibration before the first user gesture (e.g. an automatic spin on load).
        if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
        navigator.vibrate?.(ms);
    } catch {
        /* unsupported */
    }
}

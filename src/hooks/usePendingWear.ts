import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import type { WeatherData } from '../types';

const UNDO_WINDOW_MS = 4000;

interface Pending {
    itemIds: string[];
    moodId: string;
    weather: WeatherData | null;
    date?: Date;
    timerId: number;
}

/**
 * "Wear it" with a short undo window: the wear is logged after 4s unless undone, and a still-pending
 * wear is flushed on unmount so navigating away never silently drops it.
 */
export function usePendingWear() {
    const { logOutfitWear } = useWardrobe();
    const [isPending, setIsPending] = useState(false);
    const [logged, setLogged] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const pendingRef = useRef<Pending | null>(null);
    const logRef = useRef(logOutfitWear);
    useLayoutEffect(() => { logRef.current = logOutfitWear; });

    /** A short toast with no wear behind it (e.g. "Already logged today."). */
    const notify = useCallback((text: string) => {
        setNotice(text);
        window.setTimeout(() => setNotice(null), 2200);
    }, []);

    const wear = useCallback((itemIds: string[], moodId: string, weather: WeatherData | null, date?: Date) => {
        if (pendingRef.current) window.clearTimeout(pendingRef.current.timerId);
        const timerId = window.setTimeout(async () => {
            pendingRef.current = null;
            setIsPending(false);
            const saved = await logRef.current(itemIds, moodId, weather, date);
            if (!saved) {
                notify('Already logged today.');
                return;
            }
            setLogged(true);
            window.setTimeout(() => setLogged(false), 2200);
        }, UNDO_WINDOW_MS);
        pendingRef.current = { itemIds, moodId, weather, date, timerId };
        setIsPending(true);
    }, [notify]);

    const undo = useCallback(() => {
        if (pendingRef.current) window.clearTimeout(pendingRef.current.timerId);
        pendingRef.current = null;
        setIsPending(false);
    }, []);

    useEffect(() => () => {
        const pending = pendingRef.current;
        if (pending) {
            window.clearTimeout(pending.timerId);
            void logRef.current(pending.itemIds, pending.moodId, pending.weather, pending.date);
            pendingRef.current = null;
        }
    }, []);

    return { wear, undo, notify, isPending, logged, notice };
}

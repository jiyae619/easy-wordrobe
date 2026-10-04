import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import type { WeatherData } from '../types';

const UNDO_WINDOW_MS = 4000;

interface Pending {
    itemIds: string[];
    moodId: string;
    weather: WeatherData;
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
    const pendingRef = useRef<Pending | null>(null);
    const logRef = useRef(logOutfitWear);
    useLayoutEffect(() => { logRef.current = logOutfitWear; });

    const wear = useCallback((itemIds: string[], moodId: string, weather: WeatherData) => {
        if (pendingRef.current) window.clearTimeout(pendingRef.current.timerId);
        const timerId = window.setTimeout(async () => {
            pendingRef.current = null;
            setIsPending(false);
            await logRef.current(itemIds, moodId, weather);
            setLogged(true);
            window.setTimeout(() => setLogged(false), 2200);
        }, UNDO_WINDOW_MS);
        pendingRef.current = { itemIds, moodId, weather, timerId };
        setIsPending(true);
    }, []);

    const undo = useCallback(() => {
        if (pendingRef.current) window.clearTimeout(pendingRef.current.timerId);
        pendingRef.current = null;
        setIsPending(false);
    }, []);

    useEffect(() => () => {
        const pending = pendingRef.current;
        if (pending) {
            window.clearTimeout(pending.timerId);
            void logRef.current(pending.itemIds, pending.moodId, pending.weather);
            pendingRef.current = null;
        }
    }, []);

    return { wear, undo, isPending, logged };
}

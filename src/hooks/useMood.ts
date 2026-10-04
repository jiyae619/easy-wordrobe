import { useCallback, useSyncExternalStore } from 'react';
import { MOODS } from '../data/moods';
import { useWardrobe } from '../context/WardrobeContext';
import type { FashionMood } from '../types';

const MOOD_KEY = 'stylemax-mood';
const listeners = new Set<() => void>();
let memory: string | null = null; // used when sessionStorage is unavailable

function read(): string | null {
    try { return sessionStorage.getItem(MOOD_KEY) ?? memory; } catch { return memory; }
}

function subscribe(cb: () => void) {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}

/**
 * The mood selected for styling, shared by Today and Picks for the session. Falls back to the
 * user's preferred vibe, then "casual".
 */
export function useMood(): [FashionMood, (id: string) => void] {
    const { userSettings } = useWardrobe();
    const stored = useSyncExternalStore(subscribe, read, () => null);
    const id = stored || userSettings?.preferredVibe || 'casual';
    const mood = MOODS.find((m) => m.id === id) || MOODS.find((m) => m.id === 'casual') || MOODS[0];
    const setMood = useCallback((next: string) => {
        memory = next;
        try { sessionStorage.setItem(MOOD_KEY, next); } catch { /* storage unavailable — memory still holds it */ }
        listeners.forEach((l) => l());
    }, []);
    return [mood, setMood];
}

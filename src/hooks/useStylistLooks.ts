import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { awsNovaService } from '../services/awsNova';
import { useWardrobe } from '../context/WardrobeContext';
import {
    computeDeprioritizedItemIds,
    computeSeasonalLeastWornIds,
    computeWearScore,
    computeWeatherMatch,
} from '../services/agents/agentOutputGuards';
import type { ClothingItem, FashionMood, OutfitSuggestion, WeatherData } from '../types';

/** Serializable form of a look: item ids instead of item objects, so a cached look always renders
 *  the CURRENT item data (fresh wear counts, renamed items) and silently drops deleted items. */
interface StoredLook {
    id: string;
    itemIds: string[];
    explanation: string;
    isFallback?: boolean;
}

const memoryCache = new Map<string, StoredLook[]>();
const inflight = new Map<string, Promise<StoredLook[]>>();

function toStored(looks: OutfitSuggestion[]): StoredLook[] {
    return looks.map((l) => ({ id: l.id, itemIds: l.items.map((i) => i.id), explanation: l.explanation, isFallback: l.isFallback }));
}

function hydrate(stored: StoredLook[], clothes: ClothingItem[], mood: FashionMood, temperature: number): OutfitSuggestion[] {
    const byId = new Map(clothes.map((c) => [c.id, c]));
    return stored
        .map((s) => {
            const items = s.itemIds.map((id) => byId.get(id)).filter((i): i is ClothingItem => Boolean(i));
            return {
                id: s.id,
                items,
                mood,
                explanation: s.explanation,
                isFallback: s.isFallback,
                weatherMatch: computeWeatherMatch(items, temperature),
                wearScore: computeWearScore(items, clothes),
            };
        })
        .filter((l) => l.items.length > 0);
}

function readSession(key: string): StoredLook[] | null {
    try {
        const raw = sessionStorage.getItem(key);
        return raw ? (JSON.parse(raw) as StoredLook[]) : null;
    } catch {
        return null;
    }
}

export interface StylistLooks {
    looks: OutfitSuggestion[];
    isLoading: boolean;
    error: string | null;
    /** Fetch a fresh batch, bypassing the cache ("Show different looks"). */
    regenerate: () => Promise<void>;
}

/**
 * The StylistAgent's 3 looks for (wardrobe, mood, weather) — fetched once and shared by Today and
 * Picks through a session cache, so switching tabs never re-runs the model. The cache key uses the
 * SET of item ids only, so logging a wear (which bumps wear counts) does not trigger a new call.
 */
export function useStylistLooks(mood: FashionMood, weather: WeatherData | null): StylistLooks {
    const { clothes, outfits, userSettings, tryItItemIds, suggestionEvents } = useWardrobe();
    const itemsKey = useMemo(() => clothes.map((c) => c.id).sort().join(','), [clothes]);
    const key = weather
        ? `looks:v1:${itemsKey}:${mood.id}:${weather.condition.toLowerCase()}:${Math.round(weather.temperature)}`
        : null;

    const [stored, setStored] = useState<StoredLook[] | null>(() => (key ? memoryCache.get(key) ?? readSession(key) : null));
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Latest inputs for the fetch, without making them effect dependencies.
    const latest = useRef({ clothes, outfits, userSettings, tryItItemIds, suggestionEvents, mood, weather });
    latest.current = { clothes, outfits, userSettings, tryItItemIds, suggestionEvents, mood, weather };

    const fetchLooks = useCallback(async (cacheKey: string): Promise<StoredLook[]> => {
        const { clothes: c, outfits: o, userSettings: u, tryItItemIds: t, suggestionEvents: e, mood: m, weather: w } = latest.current;
        if (!w) return [];
        const userProfile = u ? { gender: u.gender, height: u.height, weight: u.weight } : undefined;
        const behavioralContext = {
            // Computed deterministically from wear history — no dependency on the Insights page.
            leastWornItemIds: computeSeasonalLeastWornIds(c, o),
            tryItItemIds: t,
            deprioritizeItemIds: computeDeprioritizedItemIds(e, c),
        };
        const result = toStored(await awsNovaService.suggestOutfits(c, m, w, userProfile, behavioralContext));
        memoryCache.set(cacheKey, result);
        try { sessionStorage.setItem(cacheKey, JSON.stringify(result)); } catch { /* quota — memory cache still works */ }
        return result;
    }, []);

    useEffect(() => {
        if (!key || clothes.length === 0) {
            setStored(null);
            return;
        }
        const cached = memoryCache.get(key) ?? readSession(key);
        if (cached) {
            setStored(cached);
            setError(null);
            return;
        }
        let cancelled = false;
        setIsLoading(true);
        setError(null);
        let promise = inflight.get(key);
        if (!promise) {
            promise = fetchLooks(key).finally(() => inflight.delete(key));
            inflight.set(key, promise);
        }
        promise
            .then((r) => { if (!cancelled) setStored(r); })
            .catch((err) => {
                console.error('Stylist error:', err);
                if (!cancelled) setError('Failed to generate suggestions. Please try again.');
            })
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, [key, clothes.length, fetchLooks]);

    const regenerate = useCallback(async () => {
        if (!key) return;
        setIsLoading(true);
        setError(null);
        try {
            setStored(await fetchLooks(key));
        } catch (err) {
            console.error('Regeneration error:', err);
            setError('Failed to generate suggestions. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [key, fetchLooks]);

    const looks = useMemo(
        () => (stored && weather ? hydrate(stored, clothes, mood, weather.temperature) : []),
        [stored, clothes, mood, weather],
    );

    return { looks, isLoading, error, regenerate };
}

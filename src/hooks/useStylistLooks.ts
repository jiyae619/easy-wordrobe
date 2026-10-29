import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { awsNovaService } from '../services/awsNova';
import { useWardrobe } from '../context/WardrobeContext';
import {
    computeDeprioritizedItemIds,
    computeSeasonalLeastWornIds,
    computeWearScore,
    computeWeatherMatch,
    getWardrobeReadiness,
    seasonForTemperature,
} from '../services/agents/agentOutputGuards';
import { useTodayWeather } from './useTodayWeather';
import { computeMoodMatch } from '../services/agents/moodFit';
import { buildCodeLooks } from '../services/agents/StylistAgent';
import type { ClothingItem, FashionMood, OutfitSuggestion, WeatherData } from '../types';

/** Serializable form of a look: item ids instead of item objects, so a cached look always renders
 *  the CURRENT item data (fresh wear counts, renamed items) and silently drops deleted items. */
interface StoredLook {
    id: string;
    itemIds: string[];
    explanation: string;
    isFallback?: boolean;
}

interface MemoryEntry {
    looks: StoredLook[];
    at: number;
}

const memoryCache = new Map<string, MemoryEntry>();
const inflight = new Map<string, Promise<StoredLook[]>>();

/** Fallback (code-assembled) batches are kept in memory only, and only this long, so the AI is
 *  retried soon after an outage instead of the quick picks sticking for the whole day. */
const FALLBACK_TTL_MS = 60_000;
const STORAGE_PREFIX = 'stylemax-looks:';
const MAX_STORED_BATCHES = 24;

function dayKey(date = new Date()): string {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** FNV-1a: a short, stable fingerprint of the wardrobe's item-id set for the cache key. */
function fingerprint(text: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
}

/**
 * The weather part of the cache key, coarsened to what changes an outfit: the temperature band
 * computeWeatherMatch scores against (<=5 / <=15 / <=24 / >24 °C) and wet vs dry. "Now" weather
 * refreshes every 30 minutes, and keying on the exact reading ("Partly Cloudy" 18° → "Mostly
 * Cloudy" 19°) re-ran the model and reset the swipe stack. The prompt still gets the exact weather.
 * No weather at all (location off, no city) is its own bucket: looks still generate.
 */
export function weatherCacheBucket(weather: Pick<WeatherData, 'temperature' | 'condition'> | null): string {
    if (!weather) return 'noweather';
    const wet = /rain|shower|drizzle|thunder|storm|snow|sleet|flurr|ice|blizzard/.test(weather.condition.toLowerCase());
    return `${wet ? 'wet' : 'dry'}-${seasonForTemperature(weather.temperature)}`;
}

function readMemory(key: string): StoredLook[] | null {
    const entry = memoryCache.get(key);
    if (!entry) return null;
    const isFallback = entry.looks.some((l) => l.isFallback);
    if (isFallback && Date.now() - entry.at > FALLBACK_TTL_MS) {
        memoryCache.delete(key);
        return null;
    }
    return entry.looks;
}

/** Today's AI batches persist in localStorage so reopening the app later the same day is instant. */
function readStored(key: string): StoredLook[] | null {
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        return raw ? (JSON.parse(raw) as StoredLook[]) : null;
    } catch {
        return null;
    }
}

function writeStored(key: string, looks: StoredLook[]): void {
    try {
        const today = `${STORAGE_PREFIX}v2:${dayKey()}:`;
        const ours: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
            const k = localStorage.key(i);
            if (k?.startsWith(STORAGE_PREFIX)) ours.push(k);
        }
        // Drop other days' batches, and the oldest of today's beyond the cap.
        const stale = ours.filter((k) => !k.startsWith(today));
        const todays = ours.filter((k) => k.startsWith(today));
        stale.concat(todays.slice(0, Math.max(0, todays.length - MAX_STORED_BATCHES + 1)))
            .forEach((k) => localStorage.removeItem(k));
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(looks));
    } catch {
        /* storage unavailable or full: the memory cache still works */
    }
}

function readCache(key: string): StoredLook[] | null {
    return readMemory(key) ?? readStored(key);
}

function toStored(looks: OutfitSuggestion[]): StoredLook[] {
    return looks.map((l) => ({ id: l.id, itemIds: l.items.map((i) => i.id), explanation: l.explanation, isFallback: l.isFallback }));
}

function hydrate(stored: StoredLook[], clothes: ClothingItem[], mood: FashionMood, temperature: number | null): OutfitSuggestion[] {
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
                moodMatch: computeMoodMatch(items, mood.id),
            };
        })
        .filter((l) => l.items.length > 0);
}

export interface StylistLooks {
    looks: OutfitSuggestion[];
    /**
     * Instant, code-assembled looks for this mood (flagged isFallback, stable ids) while `looks` is
     * still empty: from first paint, before weather or the model answer. Empty once `looks` is
     * ready. A UI can show these straight away and swap in the AI looks when they land.
     */
    previewLooks: OutfitSuggestion[];
    isLoading: boolean;
    error: string | null;
    /** Fetch a fresh batch, bypassing the cache ("Show different looks"). */
    regenerate: () => Promise<void>;
}

/**
 * The StylistAgent's 3 looks for (wardrobe, mood, weather) — fetched once and shared by Today and
 * Tweak mode through a cache (memory, then localStorage for the rest of the day), so switching tabs
 * or reopening the app never re-runs the model. The key uses the SET of item ids only, so logging a
 * wear (which bumps wear counts) does not trigger a new call, and a coarse weather bucket, so a
 * small change in the reading does not either.
 *
 * Weather is optional: while the first reading is still loading the hook waits for it (one call,
 * not a no-weather call followed by a weather one), but when there is no weather to wait for
 * (location off and no city, or the lookup failed) looks are generated without it.
 */
export function useStylistLooks(mood: FashionMood, weather: WeatherData | null): StylistLooks {
    const { clothes, outfits, userSettings, tryItItemIds, suggestionEvents } = useWardrobe();
    const { isLoading: weatherLoading } = useTodayWeather();
    const canStyle = getWardrobeReadiness(clothes).canMakeOutfit;
    const itemsKey = useMemo(() => fingerprint(clothes.map((c) => c.id).sort().join(',')), [clothes]);
    const waitingForWeather = !weather && weatherLoading;
    const key = canStyle && !waitingForWeather
        ? `v2:${dayKey()}:${itemsKey}:${mood.id}:${weatherCacheBucket(weather)}`
        : null;

    // Looks are stored WITH the key they belong to: after a mood switch the previous mood's looks
    // must not keep rendering (labelled as the new mood) while the new batch loads.
    const [stored, setStored] = useState<{ key: string; looks: StoredLook[] } | null>(() => {
        const cached = key ? readCache(key) : null;
        return key && cached ? { key, looks: cached } : null;
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Latest inputs for the fetch, without making them effect dependencies.
    const latest = useRef({ clothes, outfits, userSettings, tryItItemIds, suggestionEvents, mood, weather });
    latest.current = { clothes, outfits, userSettings, tryItItemIds, suggestionEvents, mood, weather };

    const fetchLooks = useCallback(async (cacheKey: string): Promise<StoredLook[]> => {
        const { clothes: c, outfits: o, userSettings: u, tryItItemIds: t, suggestionEvents: e, mood: m, weather: w } = latest.current;
        const userProfile = u ? { gender: u.gender, height: u.height, weight: u.weight } : undefined;
        const behavioralContext = {
            // Computed deterministically from wear history — no dependency on the Insights page.
            leastWornItemIds: computeSeasonalLeastWornIds(c, o),
            tryItItemIds: t,
            deprioritizeItemIds: computeDeprioritizedItemIds(e, c),
        };
        const result = toStored(await awsNovaService.suggestOutfits(c, m, w, userProfile, behavioralContext));
        memoryCache.set(cacheKey, { looks: result, at: Date.now() });
        // Only real AI batches are persisted; fallback picks stay in memory briefly (FALLBACK_TTL_MS).
        if (!result.some((l) => l.isFallback)) writeStored(cacheKey, result);
        return result;
    }, []);

    useEffect(() => {
        if (!key) {
            setStored(null);
            setIsLoading(false);
            return;
        }
        const cached = readCache(key);
        if (cached) {
            setStored({ key, looks: cached });
            setError(null);
            setIsLoading(false);
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
            .then((r) => { if (!cancelled) setStored({ key, looks: r }); })
            .catch((err) => {
                console.error('Stylist error:', err);
                if (!cancelled) setError('Your stylist hit a snag. Want to try again?');
            })
            .finally(() => { if (!cancelled) setIsLoading(false); });
        return () => { cancelled = true; };
    }, [key, fetchLooks]);

    const regenerate = useCallback(async () => {
        if (!key) return;
        setIsLoading(true);
        setError(null);
        try {
            setStored({ key, looks: await fetchLooks(key) });
        } catch (err) {
            console.error('Regeneration error:', err);
            setError('Your stylist hit a snag. Want to try again?');
        } finally {
            setIsLoading(false);
        }
    }, [key, fetchLooks]);

    const current = stored && stored.key === key ? stored.looks : null;
    const temperature = weather ? weather.temperature : null;
    const looks = useMemo(
        () => (current ? hydrate(current, clothes, mood, temperature) : []),
        [current, clothes, mood, temperature],
    );

    // Pure code (no model, no network): ~1ms for a typical closet. Recomputed only while waiting.
    const previewLooks = useMemo(() => {
        if (!canStyle || current) return [];
        return buildCodeLooks(clothes, mood, weather, {
            leastWornItemIds: computeSeasonalLeastWornIds(clothes, outfits),
            tryItItemIds,
            deprioritizeItemIds: computeDeprioritizedItemIds(suggestionEvents, clothes),
        });
    }, [canStyle, current, clothes, outfits, tryItItemIds, suggestionEvents, mood, weather]);

    return { looks, previewLooks, isLoading: isLoading || (Boolean(key) && !current && !error), error, regenerate };
}

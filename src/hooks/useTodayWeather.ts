import { useEffect, useState } from 'react';
import { weatherService, type LiveWeather } from '../services/weatherService';
import { awsNovaService } from '../services/awsNova';
import { useWardrobe } from '../context/WardrobeContext';
import type { WeatherOutlookPeriod } from '../types';

// Same key/shape (`weather`, `weatherOutlook`, `weatherCheer`) that OutfitHistory reads.
const WEATHER_CACHE_KEY = 'home-weather-cache-v1';
/** The device's last real position (localStorage), used when a fresh fix times out. */
const LAST_COORDS_KEY = 'weather-last-coords-v1';
/** "Now" goes stale: refetch after this long (on mount or when the tab becomes visible). */
export const WEATHER_TTL_MS = 30 * 60 * 1000;
/** After a failed refresh, keep showing the previous reading only while it is this recent. */
const KEEP_ON_ERROR_MS = 2 * 60 * 60 * 1000;
const LAST_COORDS_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
/** After a failed refresh, try again this soon instead of waiting a full TTL. */
const RETRY_AFTER_ERROR_MS = 2 * 60 * 1000;

/** Where the coordinates behind the reading came from. */
export type WeatherLocationSource = 'device' | 'last-known' | 'city' | 'none';

export interface TodayWeather {
    weather: LiveWeather | null;
    outlook: WeatherOutlookPeriod[];
    cheer: string;
    isLoading: boolean;
    /** True when there is no location at all (location off and no city set) — the UI offers to set one. */
    usingDefaultLocation: boolean;
    locationSource: WeatherLocationSource;
    /** 'no-location': nothing to look up. 'unavailable': NWS had no real data. */
    error: 'no-location' | 'unavailable' | null;
}

interface CachedWeather {
    weather: LiveWeather | null;
    weatherOutlook: WeatherOutlookPeriod[];
    weatherCheer: string;
    usingDefaultLocation: boolean;
    locationSource: WeatherLocationSource;
    error: TodayWeather['error'];
    /** City setting this was loaded for; a cached entry for another city is ignored. */
    city: string;
    fetchedAt: number;
}

function readCache(city: string): CachedWeather | null {
    try {
        const raw = sessionStorage.getItem(WEATHER_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<CachedWeather>;
        // Entries from before provenance/TTL existed (or another city) are not trusted.
        if (typeof parsed.fetchedAt !== 'number' || parsed.city !== city || !parsed.locationSource) return null;
        return parsed as CachedWeather;
    } catch {
        try { sessionStorage.removeItem(WEATHER_CACHE_KEY); } catch { /* storage unavailable */ }
        return null;
    }
}

function writeCache(data: CachedWeather) {
    try { sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data)); } catch { /* quota / private mode */ }
}

function readLastCoords(): { lat: number; lon: number } | null {
    try {
        const raw = localStorage.getItem(LAST_COORDS_KEY);
        if (!raw) return null;
        const { lat, lon, at } = JSON.parse(raw) as { lat: number; lon: number; at: number };
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || Date.now() - at > LAST_COORDS_MAX_AGE_MS) return null;
        return { lat, lon };
    } catch {
        return null;
    }
}

function saveLastCoords(lat: number, lon: number) {
    try { localStorage.setItem(LAST_COORDS_KEY, JSON.stringify({ lat, lon, at: Date.now() })); } catch { /* ignore */ }
}

function getDevicePosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation unsupported'));
            return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000, maximumAge: 10 * 60 * 1000 });
    });
}

/** Device location first; then the user's chosen city; then the device's last known position. */
async function resolveCoords(city: string): Promise<{ lat: number; lon: number; source: WeatherLocationSource } | null> {
    try {
        const { latitude, longitude } = (await getDevicePosition()).coords;
        saveLastCoords(latitude, longitude);
        return { lat: latitude, lon: longitude, source: 'device' };
    } catch {
        // denied / unavailable / timed out
    }
    const cityCoords = city ? weatherService.getCityCoords(city) : null;
    if (cityCoords) return { ...cityCoords, source: 'city' };
    const last = readLastCoords();
    if (last) return { ...last, source: 'last-known' };
    return null;
}

/** Reuse the previous cheer when the weather barely moved, so a refresh doesn't re-run the model. */
function reusableCheer(prev: CachedWeather | null, weather: LiveWeather): string {
    const pw = prev?.weather;
    if (!pw || !prev?.weatherCheer) return '';
    const same = pw.location === weather.location
        && pw.condition === weather.condition
        && Math.abs(pw.temperature - weather.temperature) <= 2;
    return same ? prev.weatherCheer : '';
}

async function loadWeather(city: string, prev: CachedWeather | null): Promise<CachedWeather> {
    const base = { city, fetchedAt: Date.now() };
    const coords = await resolveCoords(city);
    if (!coords) {
        // No location at all: say so. Never substitute another city's weather.
        const result: CachedWeather = {
            ...base, weather: null, weatherOutlook: [], weatherCheer: '',
            usingDefaultLocation: true, locationSource: 'none', error: 'no-location',
        };
        writeCache(result);
        return result;
    }

    let weather: LiveWeather;
    let outlook: WeatherOutlookPeriod[];
    try {
        ({ weather, outlook } = await weatherService.getTodayWeather(coords.lat, coords.lon));
    } catch (err) {
        console.error('[Weather] unavailable:', err);
        // A transient failure keeps a recent real reading (it carries its own asOf time).
        if (prev?.weather && Date.now() - prev.fetchedAt < KEEP_ON_ERROR_MS) return prev;
        return {
            ...base, weather: null, weatherOutlook: [], weatherCheer: '',
            usingDefaultLocation: false, locationSource: coords.source, error: 'unavailable',
        };
    }

    const reused = reusableCheer(prev, weather);
    const result: CachedWeather = {
        ...base,
        weather,
        weatherOutlook: outlook,
        weatherCheer: reused || `The ${weather.condition.toLowerCase()} vibes are here. You have this today.`,
        usingDefaultLocation: false,
        locationSource: coords.source,
        error: null,
    };
    writeCache(result);
    // The cheer line is a model call and pure decoration: publish the weather now (the stylist waits
    // on it) and swap the line in when it lands.
    if (!reused) {
        void awsNovaService.generateWeatherCheer(weather, outlook)
            .then((cheer) => {
                if (!cheer) return;
                const withCheer = { ...result, weatherCheer: cheer };
                writeCache(withCheer);
                // Pages mounted later reuse the in-flight load, so it must carry the line too.
                if (inflight?.city === result.city) inflight.promise = Promise.resolve(withCheer);
                cheerListeners.forEach((fn) => fn(withCheer));
            })
            .catch(() => undefined);
    }
    return result;
}

/** Mounted hooks, told when a late cheer line lands for the reading they show. */
const cheerListeners = new Set<(data: CachedWeather) => void>();

function toState(data: CachedWeather | null, isLoading: boolean): TodayWeather {
    return {
        weather: data?.weather ?? null,
        outlook: data?.weatherOutlook ?? [],
        cheer: data?.weatherCheer ?? '',
        isLoading,
        usingDefaultLocation: data?.usingDefaultLocation ?? false,
        locationSource: data?.locationSource ?? 'none',
        error: data?.error ?? null,
    };
}

// One in-flight load shared by every page, so Today → Picks never fetches twice.
let inflight: { city: string; startedAt: number; promise: Promise<CachedWeather> } | null = null;

function ensureLoad(city: string): Promise<CachedWeather> {
    const fresh = inflight && inflight.city === city && Date.now() - inflight.startedAt < WEATHER_TTL_MS;
    if (!fresh) {
        const cached = readCache(city);
        if (cached?.weather && Date.now() - cached.fetchedAt < WEATHER_TTL_MS) {
            // A reload within the TTL reuses this tab's reading instead of refetching.
            inflight = { city, startedAt: cached.fetchedAt, promise: Promise.resolve(cached) };
        } else {
            const startedAt = Date.now();
            const promise = loadWeather(city, cached);
            const entry = { city, startedAt, promise };
            inflight = entry;
            void promise.then((data) => {
                // No reading (or kept an older one): let the next mount / foreground retry soon.
                if (!data.weather || data.fetchedAt < startedAt) {
                    entry.startedAt = Date.now() - WEATHER_TTL_MS + RETRY_AFTER_ERROR_MS;
                }
            }, () => undefined);
        }
    }
    return inflight!.promise;
}

/**
 * Current weather (live observation, else this hour's forecast), rest-of-today outlook and the AI
 * "cheer" line — shared across pages, cached for the tab and refreshed after WEATHER_TTL_MS.
 */
export function useTodayWeather(): TodayWeather {
    const { userSettings } = useWardrobe();
    const city = userSettings?.city || '';
    const [state, setState] = useState<TodayWeather>(() => {
        const cached = readCache(city);
        return toState(cached, !cached);
    });
    // Bumped when the tab returns to the foreground so a long-open app refreshes "now".
    const [wake, setWake] = useState(0);

    useEffect(() => {
        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            if (!inflight || Date.now() - inflight.startedAt >= WEATHER_TTL_MS) setWake((n) => n + 1);
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);

    useEffect(() => {
        const onCheer = (data: CachedWeather) => {
            if (data.city === city) setState((s) => ({ ...s, cheer: data.weatherCheer }));
        };
        cheerListeners.add(onCheer);
        return () => { cheerListeners.delete(onCheer); };
    }, [city]);

    useEffect(() => {
        let cancelled = false;
        const promise = ensureLoad(city);
        promise
            .then((data) => {
                if (!cancelled) setState(toState(data, false));
            })
            .catch((err) => {
                console.error('Weather load error:', err);
                if (inflight?.promise === promise) inflight = null; // allow a retry on next mount
                if (!cancelled) setState((s) => ({ ...s, isLoading: false }));
            });
        return () => { cancelled = true; };
    }, [city, wake]);

    return state;
}

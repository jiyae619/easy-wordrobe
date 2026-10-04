import { useEffect, useState } from 'react';
import { weatherService } from '../services/weatherService';
import { awsNovaService } from '../services/awsNova';
import { useWardrobe } from '../context/WardrobeContext';
import type { WeatherData, WeatherOutlookPeriod } from '../types';

const WEATHER_CACHE_KEY = 'home-weather-cache-v1';

export interface TodayWeather {
    weather: WeatherData | null;
    outlook: WeatherOutlookPeriod[];
    cheer: string;
    isLoading: boolean;
    /** True when location was unavailable and no city is set — the UI offers to set one. */
    usingDefaultLocation: boolean;
}

interface CachedWeather {
    weather: WeatherData;
    weatherOutlook: WeatherOutlookPeriod[];
    weatherCheer: string;
    usingDefaultLocation?: boolean;
}

function readCache(): CachedWeather | null {
    try {
        const raw = sessionStorage.getItem(WEATHER_CACHE_KEY);
        return raw ? (JSON.parse(raw) as CachedWeather) : null;
    } catch {
        sessionStorage.removeItem(WEATHER_CACHE_KEY);
        return null;
    }
}

// One in-flight load shared by every page, so Today → Picks never fetches twice.
let inflight: { city: string; promise: Promise<CachedWeather> } | null = null;

async function loadWeather(city: string | undefined): Promise<CachedWeather> {
    let weather: WeatherData;
    let outlook: WeatherOutlookPeriod[];
    let usingDefaultLocation = false;
    try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        const { latitude, longitude } = position.coords;
        [weather, outlook] = await Promise.all([
            weatherService.getCurrentWeather(latitude, longitude),
            weatherService.getWeatherOutlook(latitude, longitude),
        ]);
    } catch {
        // Location denied/unavailable — use the user's chosen city, else the default.
        const fallbackCity = city || 'San Francisco';
        [weather, outlook] = await Promise.all([
            weatherService.getWeatherByCity(fallbackCity),
            weatherService.getWeatherOutlookByCity(fallbackCity),
        ]);
        usingDefaultLocation = !city;
    }
    const cheer = await awsNovaService.generateWeatherCheer(weather, outlook).catch(() => '');
    const result: CachedWeather = {
        weather,
        weatherOutlook: outlook,
        weatherCheer: cheer || `The ${weather.condition.toLowerCase()} vibes are here. You have this today.`,
        usingDefaultLocation,
    };
    sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(result));
    return result;
}

/**
 * Today's weather, outlook and AI "cheer" line — cached for the session and shared across pages.
 * Cached values render instantly; a fresh load still runs once per session (or city change).
 */
export function useTodayWeather(): TodayWeather {
    const { userSettings } = useWardrobe();
    const city = userSettings?.city || '';
    const cached = readCache();
    const [state, setState] = useState<TodayWeather>(() => ({
        weather: cached?.weather ?? null,
        outlook: cached?.weatherOutlook ?? [],
        cheer: cached?.weatherCheer ?? '',
        isLoading: !cached,
        usingDefaultLocation: cached?.usingDefaultLocation ?? false,
    }));

    useEffect(() => {
        let cancelled = false;
        if (!inflight || inflight.city !== city) {
            inflight = { city, promise: loadWeather(city || undefined) };
        }
        inflight.promise
            .then((data) => {
                if (cancelled) return;
                setState({
                    weather: data.weather,
                    outlook: data.weatherOutlook,
                    cheer: data.weatherCheer,
                    isLoading: false,
                    usingDefaultLocation: data.usingDefaultLocation ?? false,
                });
            })
            .catch((err) => {
                console.error('Weather load error:', err);
                if (inflight?.city === city) inflight = null; // allow a retry on next mount
                if (!cancelled) setState((s) => ({ ...s, isLoading: false }));
            });
        return () => { cancelled = true; };
    }, [city]);

    return state;
}

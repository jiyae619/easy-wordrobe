import axios from 'axios';
import { type WeatherData, type WeatherOutlookPeriod } from '../types';
import { setSeasonLatitude } from './agents/agentOutputGuards';

// ==========================================
// NWS (National Weather Service) API — Free, no API key required, US locations only.
// Docs: https://www.weather.gov/documentation/services-web-api
//
// "Now" comes from the nearest station's latest observation (real measured conditions). When that
// is missing or stale, the hourly forecast period covering the current hour is used instead. The
// 12-hour /forecast endpoint is NOT used for "now": its first period is today's high (or tonight's
// low), which is why the app used to show e.g. a 20° afternoon high at 7am.
//
// All temperatures leave this module in °C and wind in km/h — computeWeatherMatch, the StylistAgent
// prompt and the UI all assume °C.
// ==========================================

const NWS_BASE = "https://api.weather.gov";
const NWS_HEADERS = {
    "User-Agent": "(WardrobeAI, wardrobe-ai-app)",
    "Accept": "application/geo+json",
};
const NWS_TIMEOUT_MS = 10_000;

/** An observation older than this is not "now" any more; fall back to the hourly forecast. */
export const MAX_OBSERVATION_AGE_MS = 90 * 60 * 1000;

// Simple city → lat/lon lookup for common cities (avoids needing a geocoding API)
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
    "san francisco": { lat: 37.7749, lon: -122.4194 },
    "new york": { lat: 40.7128, lon: -74.0060 },
    "los angeles": { lat: 34.0522, lon: -118.2437 },
    "chicago": { lat: 41.8781, lon: -87.6298 },
    "seattle": { lat: 47.6062, lon: -122.3321 },
    "miami": { lat: 25.7617, lon: -80.1918 },
    "boston": { lat: 42.3601, lon: -71.0589 },
    "denver": { lat: 39.7392, lon: -104.9903 },
    "austin": { lat: 30.2672, lon: -97.7431 },
    "portland": { lat: 45.5152, lon: -122.6784 },
};

/**
 * Cities with local NWS weather support (US-only). Single source for the manual city picker;
 * getCityCoords lowercases input, so these display-cased names resolve correctly.
 */
export const SUPPORTED_CITIES = [
    "San Francisco", "New York", "Los Angeles", "Chicago", "Seattle",
    "Miami", "Boston", "Denver", "Austin", "Portland",
] as const;

// ==========================================
// Types
// ==========================================

/** Where the "now" reading came from. */
export type WeatherSource = 'observation' | 'hourly-forecast';

/** WeatherData plus provenance, so the UI can say honestly what it is showing. */
export interface LiveWeather extends WeatherData {
    source: WeatherSource;
    /** ISO time the reading is for: the observation timestamp, or the forecast hour's start. */
    asOf: string;
}

/** Thrown when real weather cannot be produced. Callers show "unavailable" — never mock numbers. */
export class WeatherUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'WeatherUnavailableError';
    }
}

/** NWS QuantitativeValue, e.g. { value: 11.1, unitCode: "wmoUnit:degC" }. */
export interface NwsQuantity {
    value: number | null;
    unitCode?: string;
}

/** The subset of /stations/{id}/observations/latest `properties` we read. */
export interface NwsObservation {
    timestamp?: string;
    textDescription?: string;
    temperature?: NwsQuantity;
    heatIndex?: NwsQuantity;
    windChill?: NwsQuantity;
    windSpeed?: NwsQuantity;
    relativeHumidity?: NwsQuantity;
}

/** The subset of a forecastHourly period we read. */
export interface NwsHourlyPeriod {
    startTime: string;
    endTime: string;
    /** A number in `temperatureUnit` (default "F"), or a QuantitativeValue on newer API flags. */
    temperature: number | NwsQuantity;
    temperatureUnit?: string;
    shortForecast?: string;
    windSpeed?: string;
    relativeHumidity?: NwsQuantity;
}

// ==========================================
// Pure parsing / selection helpers (unit-tested)
// ==========================================

const fToC = (f: number) => (f - 32) * 5 / 9;

/** NWS quantity → °C (observations are degC; handles degF defensively). Null when missing. */
export function quantityToCelsius(q: NwsQuantity | undefined): number | null {
    if (!q || q.value == null || !Number.isFinite(q.value)) return null;
    return q.unitCode?.endsWith('degF') ? fToC(q.value) : q.value;
}

/** NWS speed quantity → km/h. Null when missing. */
export function quantityToKmh(q: NwsQuantity | undefined): number | null {
    if (!q || q.value == null || !Number.isFinite(q.value)) return null;
    const unit = q.unitCode ?? 'wmoUnit:km_h-1';
    if (unit.endsWith('m_s-1') && !unit.endsWith('km_s-1')) return q.value * 3.6;
    if (unit.endsWith('kn') || unit.endsWith('kt')) return q.value * 1.852;
    if (unit.endsWith('mi_h-1') || unit.endsWith('mph')) return q.value * 1.609;
    return q.value;
}

/** Temperature of an hourly forecast period in °C, honoring `temperatureUnit`. */
export function periodTemperatureC(period: NwsHourlyPeriod): number | null {
    const t = period.temperature;
    if (typeof t === 'object' && t !== null) return quantityToCelsius(t);
    if (typeof t !== 'number' || !Number.isFinite(t)) return null;
    return (period.temperatureUnit ?? 'F').toUpperCase() === 'C' ? t : fToC(t);
}

/** "5 to 15 mph" / "10 km/h" → km/h, using the upper bound (what you dress for). */
export function parseForecastWindKmh(windSpeed: string | undefined): number | null {
    if (!windSpeed) return null;
    const nums = (windSpeed.match(/\d+(\.\d+)?/g) ?? []).map(Number);
    if (nums.length === 0) return null;
    const top = Math.max(...nums);
    return /km\/?h/i.test(windSpeed) ? top : top * 1.609;
}

/** The hourly period covering `now`, else the next upcoming one, else null. */
export function findCurrentHourlyPeriod(periods: NwsHourlyPeriod[], now: Date): NwsHourlyPeriod | null {
    const t = now.getTime();
    let upcoming: NwsHourlyPeriod | null = null;
    for (const p of periods) {
        const start = Date.parse(p.startTime);
        const end = Date.parse(p.endTime);
        if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
        if (start <= t && t < end) return p;
        if (start > t && (!upcoming || start < Date.parse(upcoming.startTime))) upcoming = p;
    }
    return upcoming;
}

export type CurrentConditions = Omit<LiveWeather, 'location'>;

/**
 * Pick "now": a fresh station observation with a real temperature wins; otherwise the hourly
 * forecast period for the current hour. Returns null when neither is usable (no fabrication).
 */
export function selectCurrentConditions(
    observation: NwsObservation | null,
    hourly: NwsHourlyPeriod[] | null,
    now: Date,
    maxObservationAgeMs: number = MAX_OBSERVATION_AGE_MS,
): CurrentConditions | null {
    const hourlyNow = hourly ? findCurrentHourlyPeriod(hourly, now) : null;
    const hourlyTemp = hourlyNow ? periodTemperatureC(hourlyNow) : null;
    const hourlyHumidity = hourlyNow?.relativeHumidity?.value ?? null;
    const hourlyWind = parseForecastWindKmh(hourlyNow?.windSpeed);
    const hourlyCondition = hourlyNow?.shortForecast?.trim() || null;

    const obsTemp = quantityToCelsius(observation?.temperature);
    const obsTime = observation?.timestamp ? Date.parse(observation.timestamp) : NaN;
    const obsFresh = Number.isFinite(obsTime) && now.getTime() - obsTime <= maxObservationAgeMs;

    if (observation && obsTemp != null && obsFresh) {
        const feels = quantityToCelsius(observation.windChill) ?? quantityToCelsius(observation.heatIndex) ?? obsTemp;
        const condition = observation.textDescription?.trim() || hourlyCondition;
        const wind = quantityToKmh(observation.windSpeed) ?? hourlyWind;
        const humidity = observation.relativeHumidity?.value ?? hourlyHumidity;
        return {
            temperature: Math.round(obsTemp),
            feelsLike: Math.round(feels),
            condition: condition || 'Unknown',
            humidity: humidity != null ? Math.round(humidity) : NaN,
            windSpeed: wind != null ? Math.round(wind) : NaN,
            source: 'observation',
            asOf: new Date(obsTime).toISOString(),
        };
    }

    if (hourlyNow && hourlyTemp != null) {
        return {
            temperature: Math.round(hourlyTemp),
            feelsLike: Math.round(hourlyTemp), // the hourly forecast has no feels-like
            condition: hourlyCondition || 'Unknown',
            humidity: hourlyHumidity != null ? Math.round(hourlyHumidity) : NaN,
            windSpeed: hourlyWind != null ? Math.round(hourlyWind) : NaN,
            source: 'hourly-forecast',
            asOf: new Date(Date.parse(hourlyNow.startTime)).toISOString(),
        };
    }

    return null;
}

/** Local (location-time) calendar date and hour straight from NWS's offset ISO string. */
function localDateHour(iso: string): { date: string; hour: number } {
    return { date: iso.slice(0, 10), hour: parseInt(iso.slice(11, 13), 10) };
}

const DAYPARTS: Array<{ label: WeatherOutlookPeriod['label']; from: number; to: number; pick: 'first' | 'max' }> = [
    { label: 'morning', from: 6, to: 12, pick: 'first' },
    { label: 'daytime', from: 12, to: 18, pick: 'max' },
    { label: 'evening', from: 18, to: 23, pick: 'first' },
];

/**
 * Rest-of-today outlook from the hourly forecast, in the location's local time: morning (first
 * remaining hour 6–11), daytime (high, 12–17), evening (first remaining hour 18–22). Dayparts that
 * have already passed are omitted rather than filled with another period's numbers.
 */
export function buildOutlookFromHourly(periods: NwsHourlyPeriod[], now: Date): WeatherOutlookPeriod[] {
    const current = findCurrentHourlyPeriod(periods, now);
    if (!current) return [];
    const today = localDateHour(current.startTime).date;
    const remaining = periods.filter((p) => {
        const end = Date.parse(p.endTime);
        return Number.isFinite(end) && end > now.getTime() && localDateHour(p.startTime).date === today;
    });

    const outlook: WeatherOutlookPeriod[] = [];
    for (const part of DAYPARTS) {
        const inPart = remaining
            .map((p) => ({ p, hour: localDateHour(p.startTime).hour, temp: periodTemperatureC(p) }))
            .filter((x): x is { p: NwsHourlyPeriod; hour: number; temp: number } =>
                x.temp != null && x.hour >= part.from && x.hour < part.to);
        if (inPart.length === 0) continue;
        const chosen = part.pick === 'max'
            ? inPart.reduce((best, x) => (x.temp > best.temp ? x : best))
            : inPart[0];
        outlook.push({
            label: part.label,
            temperature: Math.round(chosen.temp),
            condition: chosen.p.shortForecast?.trim() || 'Unknown',
        });
    }
    return outlook;
}

// ==========================================
// Network
// ==========================================

interface NwsPoint {
    forecastHourly: string;
    observationStations: string;
    relativeLocation?: { properties?: { city?: string; state?: string } };
}

// /points metadata for a coordinate never changes, so keep it for the page lifetime.
const pointCache = new Map<string, Promise<NwsPoint>>();

function getPoint(lat: number, lon: number): Promise<NwsPoint> {
    // Every weather path funnels through here with a real coordinate, so this is the single
    // place to record hemisphere for seasonal logic.
    setSeasonLatitude(lat);
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    let point = pointCache.get(key);
    if (!point) {
        point = axios
            .get(`${NWS_BASE}/points/${key}`, { headers: NWS_HEADERS, timeout: NWS_TIMEOUT_MS })
            .then((res) => res.data.properties as NwsPoint);
        point.catch(() => pointCache.delete(key));
        pointCache.set(key, point);
    }
    return point;
}

async function getHourlyPeriods(point: NwsPoint): Promise<NwsHourlyPeriod[]> {
    const res = await axios.get(point.forecastHourly, { headers: NWS_HEADERS, timeout: NWS_TIMEOUT_MS });
    return (res.data?.properties?.periods ?? []) as NwsHourlyPeriod[];
}

/** Latest observation from the nearest station that has a temperature (tries the closest two). */
async function getLatestObservation(point: NwsPoint): Promise<NwsObservation | null> {
    const stationsRes = await axios.get(point.observationStations, { headers: NWS_HEADERS, timeout: NWS_TIMEOUT_MS });
    const features = (stationsRes.data?.features ?? []) as Array<{ properties?: { stationIdentifier?: string } }>;
    const ids = features.map((f) => f.properties?.stationIdentifier).filter((id): id is string => !!id).slice(0, 2);
    for (const id of ids) {
        try {
            const obsRes = await axios.get(`${NWS_BASE}/stations/${id}/observations/latest`, { headers: NWS_HEADERS, timeout: NWS_TIMEOUT_MS });
            const obs = obsRes.data?.properties as NwsObservation | undefined;
            if (obs && quantityToCelsius(obs.temperature) != null) return obs;
        } catch {
            // try the next-nearest station
        }
    }
    return null;
}

function locationName(point: NwsPoint): string {
    const p = point.relativeLocation?.properties;
    return p?.city ? `${p.city}${p.state ? `, ${p.state}` : ''}` : 'Your location';
}

export const weatherService = {
    /**
     * Current conditions and the rest-of-today outlook for a coordinate, from one /points lookup.
     * Throws WeatherUnavailableError when NWS can't provide real data (e.g. outside the US).
     */
    getTodayWeather: async (lat: number, lon: number, now: Date = new Date()): Promise<{ weather: LiveWeather; outlook: WeatherOutlookPeriod[] }> => {
        let point: NwsPoint;
        try {
            point = await getPoint(lat, lon);
        } catch (error) {
            console.error("[NWS API] /points failed:", error);
            throw new WeatherUnavailableError('Weather is only available for US locations right now.');
        }

        const [hourlyRes, obsRes] = await Promise.allSettled([getHourlyPeriods(point), getLatestObservation(point)]);
        if (hourlyRes.status === 'rejected') console.warn("[NWS API] hourly forecast failed:", hourlyRes.reason);
        if (obsRes.status === 'rejected') console.warn("[NWS API] latest observation failed:", obsRes.reason);
        const hourly = hourlyRes.status === 'fulfilled' ? hourlyRes.value : null;
        const observation = obsRes.status === 'fulfilled' ? obsRes.value : null;

        const current = selectCurrentConditions(observation, hourly, now);
        if (!current) throw new WeatherUnavailableError('No current weather reading available.');

        return {
            weather: { ...current, location: locationName(point) },
            outlook: hourly ? buildOutlookFromHourly(hourly, now) : [],
        };
    },

    /** Current conditions for a coordinate (latest observation, else this hour's forecast). */
    getCurrentWeather: async (lat: number, lon: number): Promise<LiveWeather> => {
        return (await weatherService.getTodayWeather(lat, lon)).weather;
    },

    /** Rest-of-today morning / daytime / evening outlook for a coordinate. */
    getWeatherOutlook: async (lat: number, lon: number): Promise<WeatherOutlookPeriod[]> => {
        return (await weatherService.getTodayWeather(lat, lon)).outlook;
    },

    /** Coordinates for a supported city name (case-insensitive), or null. */
    getCityCoords: (city: string): { lat: number; lon: number } | null => {
        return CITY_COORDS[city.toLowerCase().trim()] ?? null;
    },

    /** Current conditions for a supported city. Throws for an unknown city — never guesses another. */
    getWeatherByCity: async (city: string): Promise<LiveWeather> => {
        const coords = weatherService.getCityCoords(city);
        if (!coords) throw new WeatherUnavailableError(`"${city}" isn't a supported city.`);
        return weatherService.getCurrentWeather(coords.lat, coords.lon);
    },

    getWeatherOutlookByCity: async (city: string): Promise<WeatherOutlookPeriod[]> => {
        const coords = weatherService.getCityCoords(city);
        if (!coords) throw new WeatherUnavailableError(`"${city}" isn't a supported city.`);
        return weatherService.getWeatherOutlook(coords.lat, coords.lon);
    },

    /**
     * Generate clothing recommendations based on weather conditions.
     */
    getWeatherRecommendation: (weather: WeatherData): string[] => {
        const recommendations: string[] = [];

        // Temperature-based recommendations
        if (weather.temperature < 5) {
            recommendations.push("Heavy layers, coat, warm accessories");
        } else if (weather.temperature >= 5 && weather.temperature < 15) {
            recommendations.push("Light jacket or sweater, layers");
        } else if (weather.temperature >= 15 && weather.temperature < 25) {
            recommendations.push("Light clothing, optional light layer");
        } else {
            recommendations.push("Light, breathable fabrics");
        }

        // Condition-based recommendations
        const condition = weather.condition.toLowerCase();
        if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunderstorm")) {
            recommendations.push("Waterproof layer, closed shoes");
        }
        if (condition.includes("snow")) {
            recommendations.push("Waterproof boots, warm socks");
        }

        // Wind-based recommendations
        if (weather.windSpeed > 20) {
            recommendations.push("Windbreaker or layered outfit");
        }

        return recommendations;
    }
};

import { ClothingCategory, type ClothingItem, type WeatherData } from '../../types';
import {
    BAND_RULES,
    BOOT_TERMS,
    CONDITION_RULES,
    WEATHERPROOF_OUTER_TERMS,
    WINDY_KMH,
    type TemperatureBand,
    type WeatherConditions,
    type WeatherRule,
} from '../../data/weatherStyles';
import { matchesAny, normalizeText } from './styleText';

/**
 * Code-side weather fit: how well a piece suits today's weather, scored against the rules in
 * data/weatherStyles. Like mood fit it is deterministic and instant, so it runs on every Stylist
 * request: pieces that break the weather (leather in rain, a puffer at 28 °C) never reach the
 * prompt, and every look is checked for what the weather requires (a raincoat and boots in rain,
 * a coat when it is cold).
 */

/** Below this a piece is wrong for today's weather and is kept out of the Stylist prompt. */
export const OFF_WEATHER_THRESHOLD = 0.35;
/** Score of a piece that matches an "avoid" term: under the threshold whatever else it matches. */
const VETOED = 0.2;

const WET = /rain|shower|drizzle|thunder|storm|snow|sleet|flurr|ice|blizzard|hail/;
const SNOW = /snow|sleet|flurr|ice|blizzard/;

export function bandForTemperature(celsius: number): TemperatureBand {
    if (celsius <= 5) return 'cold';
    if (celsius <= 15) return 'cool';
    if (celsius <= 24) return 'mild';
    return 'hot';
}

/** Today's weather reduced to what changes an outfit, or null when there is no weather. */
export function readWeather(weather: Pick<WeatherData, 'temperature' | 'condition'> & Partial<Pick<WeatherData, 'feelsLike' | 'windSpeed'>> | null): WeatherConditions | null {
    if (!weather || !Number.isFinite(weather.temperature)) return null;
    const feelsLikeC = Number.isFinite(weather.feelsLike) ? weather.feelsLike! : weather.temperature;
    const condition = (weather.condition ?? '').toLowerCase();
    const snow = SNOW.test(condition);
    return {
        band: bandForTemperature(feelsLikeC),
        wet: snow || WET.test(condition),
        snow,
        windy: (weather.windSpeed ?? 0) >= WINDY_KMH || /wind|gust|breez/.test(condition),
        feelsLikeC,
    };
}

/** The rules that apply today: the temperature band, then rain, snow and wind when present. */
export function activeRules(conditions: WeatherConditions): WeatherRule[] {
    return [
        BAND_RULES[conditions.band],
        ...(conditions.wet ? [CONDITION_RULES.wet] : []),
        ...(conditions.snow ? [CONDITION_RULES.snow] : []),
        ...(conditions.windy ? [CONDITION_RULES.windy] : []),
    ];
}

type FitInput = Pick<ClothingItem, 'subcategory' | 'aiTags'>;

const itemText = (item: FitInput) =>
    normalizeText([item.subcategory, ...(item.aiTags ?? []).filter((t) => typeof t === 'string')].join(' '));

/**
 * Weather fit in 0..1. Starts neutral (0.5); each active rule adds +0.3 (made for it), +0.15 (works)
 * or -0.15 (mildly wrong). Matching any rule's "avoid" list caps the score at 0.2, so a warm band
 * can't rescue a leather jacket in the rain. No weather scores everything neutral.
 */
export function itemWeatherFit(item: FitInput, conditions: WeatherConditions | null): number {
    if (!conditions) return 0.5;
    const text = itemText(item);
    let fit = 0.5;
    let vetoed = false;
    for (const { keywords } of activeRules(conditions)) {
        if (matchesAny(text, keywords.avoid)) vetoed = true;
        else if (matchesAny(text, keywords.strong)) fit += 0.3;
        else if (matchesAny(text, keywords.good)) fit += 0.15;
        else if (matchesAny(text, keywords.poor)) fit -= 0.15;
    }
    fit = Math.min(1, Math.max(0, fit));
    return vetoed ? Math.min(fit, VETOED) : fit;
}

/** Outfit weather fit 0-1: the mean of its pieces' fit. */
export function outfitWeatherFit(items: FitInput[], conditions: WeatherConditions | null): number {
    if (items.length === 0) return 0.5;
    return items.reduce((sum, item) => sum + itemWeatherFit(item, conditions), 0) / items.length;
}

const isWeatherproofOuter = (c: ClothingItem) =>
    c.category === ClothingCategory.Outerwear && matchesAny(itemText(c), WEATHERPROOF_OUTER_TERMS);
const isBoot = (c: ClothingItem) => c.category === ClothingCategory.Shoes && matchesAny(itemText(c), BOOT_TERMS);

/** What today's weather requires of every look, given the pieces available. */
export interface WeatherNeeds {
    /** An outer layer on every look (cold, cool, rain, snow). */
    outer: boolean;
    /** Weatherproof outer layers to use when it is wet or windy (best first); empty = none owned. */
    weatherproofOuter: ClothingItem[];
    /** Boots to wear when it is wet or snowy (best first); empty = none owned. */
    boots: ClothingItem[];
}

export function weatherNeeds(candidates: ClothingItem[], conditions: WeatherConditions | null): WeatherNeeds {
    if (!conditions) return { outer: false, weatherproofOuter: [], boots: [] };
    const byFit = (a: ClothingItem, b: ClothingItem) => itemWeatherFit(b, conditions) - itemWeatherFit(a, conditions);
    const shelter = conditions.wet || conditions.windy;
    return {
        outer: conditions.band === 'cold' || conditions.band === 'cool' || conditions.wet,
        weatherproofOuter: shelter ? candidates.filter(isWeatherproofOuter).sort(byFit) : [],
        boots: conditions.wet ? candidates.filter(isBoot).sort(byFit) : [],
    };
}

/**
 * Make a look meet today's weather, using only pieces from `candidates`:
 *  - wet or windy, with a weatherproof layer owned: the look wears one (added on top);
 *  - cold, cool or wet: the look has some outer layer (the warmest-fitting one) if any is owned;
 *  - wet, with boots owned: boots replace other shoes (or are added).
 * Composition stays valid: outer layers are optional on both outfit shapes, shoes are one at most.
 * `rotate` picks a different weatherproof layer / pair of boots per look when there are several.
 */
export function applyWeatherNeeds(look: ClothingItem[], candidates: ClothingItem[], conditions: WeatherConditions | null, rotate = 0): ClothingItem[] {
    if (!conditions) return look;
    const needs = weatherNeeds(candidates, conditions);
    let result = [...look];
    const pick = (group: ClothingItem[]) => group[rotate % group.length];

    if (needs.weatherproofOuter.length > 0 && !result.some(isWeatherproofOuter)) {
        result = [pick(needs.weatherproofOuter), ...result];
    } else if (needs.outer && !result.some((c) => c.category === ClothingCategory.Outerwear)) {
        const outer = candidates
            .filter((c) => c.category === ClothingCategory.Outerwear && !result.includes(c))
            .sort((a, b) => itemWeatherFit(b, conditions) - itemWeatherFit(a, conditions));
        if (outer.length > 0) result = [pick(outer), ...result];
    }

    if (needs.boots.length > 0 && !result.some(isBoot)) {
        result = [...result.filter((c) => c.category !== ClothingCategory.Shoes), pick(needs.boots)];
    }
    return result;
}

/** The weather part of the Stylist prompt: the reading, then each active rule and what to use. */
export function weatherBrief(
    weather: Pick<WeatherData, 'temperature' | 'feelsLike' | 'condition' | 'windSpeed'>,
    conditions: WeatherConditions,
    needs: WeatherNeeds,
    alias: (ids: string[]) => string[],
): string {
    const wind = Number.isFinite(weather.windSpeed) && weather.windSpeed > 0 ? `, wind ${Math.round(weather.windSpeed)} km/h` : '';
    const lines = [`WEATHER NOW: ${Math.round(weather.temperature)}°C (feels like ${Math.round(conditions.feelsLikeC)}°C), ${weather.condition}${wind}.`];
    for (const rule of activeRules(conditions)) lines.push(`- ${rule.label}: ${rule.brief}`);
    if (needs.weatherproofOuter.length > 0) {
        lines.push(`- Every outfit must include one of these weatherproof layers: ${JSON.stringify(alias(needs.weatherproofOuter.map((c) => c.id)))}.`);
    } else if (needs.outer) {
        lines.push('- Every outfit must include an outerwear piece if the closet has one.');
    }
    if (needs.boots.length > 0) lines.push(`- Shoes must be one of these boots: ${JSON.stringify(alias(needs.boots.map((c) => c.id)))}.`);
    lines.push('Pieces that break today\'s weather were already removed.');
    return lines.join('\n');
}

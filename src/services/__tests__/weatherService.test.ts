import { describe, expect, it } from 'vitest';
import {
    buildOutlookFromHourly,
    findCurrentHourlyPeriod,
    parseForecastWindKmh,
    periodTemperatureC,
    quantityToCelsius,
    quantityToKmh,
    selectCurrentConditions,
    type NwsHourlyPeriod,
    type NwsObservation,
} from '../weatherService';

// Seattle, Thu 29 Oct 2026 (PDT, UTC-7). Shapes mirror api.weather.gov forecastHourly / observations.
const pad = (n: number) => String(n).padStart(2, '0');
const hour = (day: number, h: number, tempF: number, shortForecast = 'Mostly Cloudy'): NwsHourlyPeriod => ({
    startTime: `2026-10-${pad(day)}T${pad(h)}:00:00-07:00`,
    endTime: h === 23 ? `2026-10-${pad(day + 1)}T00:00:00-07:00` : `2026-10-${pad(day)}T${pad(h + 1)}:00:00-07:00`,
    temperature: tempF,
    temperatureUnit: 'F',
    shortForecast,
    windSpeed: '5 mph',
    relativeHumidity: { unitCode: 'wmoUnit:percent', value: 88 },
});

// 06:00–23:00 today plus the small hours of tomorrow. 68°F (20°C) appears only as the afternoon high.
const TEMPS_F: Record<number, number> = {
    6: 47, 7: 48, 8: 49, 9: 51, 10: 53, 11: 55, 12: 60, 13: 64, 14: 68, 15: 66, 16: 62, 17: 58,
    18: 55, 19: 53, 20: 52, 21: 51, 22: 50, 23: 50,
};
const HOURLY: NwsHourlyPeriod[] = [
    ...Object.entries(TEMPS_F).map(([h, t]) => hour(29, Number(h), t, Number(h) >= 18 ? 'Chance Light Rain' : 'Mostly Cloudy')),
    hour(30, 0, 49), hour(30, 1, 48),
];

const at = (local: string) => new Date(`2026-10-29T${local}:00-07:00`);
const NOW = at('06:58'); // 13:58 UTC

const observation = (overrides: Partial<NwsObservation> = {}): NwsObservation => ({
    timestamp: '2026-10-29T13:53:00+00:00',
    textDescription: 'Cloudy',
    temperature: { unitCode: 'wmoUnit:degC', value: 10.6 },
    windChill: { unitCode: 'wmoUnit:degC', value: 8.9 },
    heatIndex: { unitCode: 'wmoUnit:degC', value: null },
    windSpeed: { unitCode: 'wmoUnit:km_h-1', value: 14.8 },
    relativeHumidity: { unitCode: 'wmoUnit:percent', value: 86.4 },
    ...overrides,
});

describe('unit conversion', () => {
    it('reads observation quantities as °C and km/h', () => {
        expect(quantityToCelsius({ unitCode: 'wmoUnit:degC', value: 10.6 })).toBe(10.6);
        expect(quantityToCelsius({ unitCode: 'wmoUnit:degF', value: 50 })).toBeCloseTo(10, 5);
        expect(quantityToCelsius({ unitCode: 'wmoUnit:degC', value: null })).toBeNull();
        expect(quantityToKmh({ unitCode: 'wmoUnit:km_h-1', value: 14.8 })).toBe(14.8);
        expect(quantityToKmh({ unitCode: 'wmoUnit:m_s-1', value: 5 })).toBeCloseTo(18, 5);
    });

    it('converts hourly temperatures by temperatureUnit', () => {
        expect(periodTemperatureC(hour(29, 9, 50))).toBeCloseTo(10, 5);
        expect(periodTemperatureC({ ...hour(29, 9, 12), temperatureUnit: 'C' })).toBe(12);
        expect(periodTemperatureC({ ...hour(29, 9, 0), temperature: { unitCode: 'wmoUnit:degC', value: 11 } })).toBe(11);
    });

    it('parses forecast wind strings to km/h using the upper bound', () => {
        expect(parseForecastWindKmh('5 to 15 mph')).toBeCloseTo(24.135, 3);
        expect(parseForecastWindKmh('10 km/h')).toBe(10);
        expect(parseForecastWindKmh(undefined)).toBeNull();
        expect(parseForecastWindKmh('calm')).toBeNull();
    });
});

describe('findCurrentHourlyPeriod', () => {
    it('returns the period covering now', () => {
        expect(findCurrentHourlyPeriod(HOURLY, NOW)?.startTime).toBe('2026-10-29T06:00:00-07:00');
        expect(findCurrentHourlyPeriod(HOURLY, at('14:30'))?.startTime).toBe('2026-10-29T14:00:00-07:00');
    });

    it('falls back to the next upcoming period, or null when all are past', () => {
        expect(findCurrentHourlyPeriod(HOURLY, at('05:10'))?.startTime).toBe('2026-10-29T06:00:00-07:00');
        expect(findCurrentHourlyPeriod(HOURLY, new Date('2026-10-30T12:00:00-07:00'))).toBeNull();
    });
});

describe('selectCurrentConditions', () => {
    it('prefers a fresh station observation (real measured "now")', () => {
        const c = selectCurrentConditions(observation(), HOURLY, NOW);
        expect(c).toEqual({
            temperature: 11,
            feelsLike: 9,
            condition: 'Cloudy',
            humidity: 86,
            windSpeed: 15,
            source: 'observation',
            asOf: '2026-10-29T13:53:00.000Z',
        });
    });

    it('never reports the afternoon high as "now" (the old 20° Mostly Cloudy bug)', () => {
        const c = selectCurrentConditions(null, HOURLY, NOW)!;
        expect(c.source).toBe('hourly-forecast');
        expect(c.temperature).toBe(8); // 47°F at 06:00, not the 68°F / 20°C afternoon high
        expect(c.condition).toBe('Mostly Cloudy');
        expect(c.asOf).toBe('2026-10-29T13:00:00.000Z');
    });

    it('falls back to the current hourly period when the observation is stale or has no temperature', () => {
        const stale = observation({ timestamp: '2026-10-29T10:53:00+00:00' });
        expect(selectCurrentConditions(stale, HOURLY, NOW)?.source).toBe('hourly-forecast');
        const noTemp = observation({ temperature: { unitCode: 'wmoUnit:degC', value: null } });
        expect(selectCurrentConditions(noTemp, HOURLY, NOW)?.source).toBe('hourly-forecast');
    });

    it('uses the hourly condition when the observation has no text description', () => {
        const c = selectCurrentConditions(observation({ textDescription: '' }), HOURLY, NOW);
        expect(c?.source).toBe('observation');
        expect(c?.condition).toBe('Mostly Cloudy');
    });

    it('returns null instead of inventing numbers when nothing usable is available', () => {
        expect(selectCurrentConditions(null, null, NOW)).toBeNull();
        expect(selectCurrentConditions(null, [], NOW)).toBeNull();
    });
});

describe('buildOutlookFromHourly', () => {
    it('summarises the rest of today in local time', () => {
        expect(buildOutlookFromHourly(HOURLY, NOW)).toEqual([
            { label: 'morning', temperature: 8, condition: 'Mostly Cloudy' },
            { label: 'daytime', temperature: 20, condition: 'Mostly Cloudy' }, // the 68°F high
            { label: 'evening', temperature: 13, condition: 'Chance Light Rain' },
        ]);
    });

    it('omits dayparts that have already passed instead of filling them', () => {
        const outlook = buildOutlookFromHourly(HOURLY, at('15:30'));
        expect(outlook.map((p) => p.label)).toEqual(['daytime', 'evening']);
        expect(outlook[0].temperature).toBe(19); // 66°F at 15:00 — the 14:00 high is past
    });

    it('never borrows tomorrow\'s hours late at night', () => {
        expect(buildOutlookFromHourly(HOURLY, at('23:30'))).toEqual([]);
    });
});

import { describe, expect, it } from 'vitest';
import { ClothingCategory, Season, type ClothingItem } from '../../types';
import {
    dustyLine,
    forgottenSubtitle,
    goToSubtitle,
    mixNote,
    picksDoneLine,
    starterQuestion,
    streakLine,
    stylistLoadingLine,
    wearSavedLine,
    weatherKind,
    welcomeBackLine,
    wornLine,
} from '../voice';

const piece = (id: string, category: ClothingCategory, color: string, subcategory: string, wearFrequency = 3): ClothingItem => ({
    id, category, color, subcategory, colorHex: '#000000', imageUrl: '', season: [Season.Fall],
    wearFrequency, lastWorn: null, dateAdded: new Date(2026, 0, 1), aiTags: [],
});

const tee = piece('tee', ClothingCategory.Tops, 'White', 'Crew Tee');
const pinkTop = piece('pink', ClothingCategory.Tops, 'Pink', 'Silk Blouse');
const jeans = piece('jeans', ClothingCategory.Bottoms, 'Blue', 'Slim Jeans');
const black = piece('black', ClothingCategory.Bottoms, 'Black', 'Trousers');
const coat = piece('coat', ClothingCategory.Outerwear, 'Camel', 'Wool Coat');
const rain = { temperature: 14, condition: 'Drizzle' };
const cold = { temperature: 2, condition: 'Clear' };
const hot = { temperature: 31, condition: 'Sunny' };
const none = new Map<string, number>();

/** Every line the module can produce for a spread of contexts. */
function sampleLines(): string[] {
    const lines: string[] = [];
    const weathers = [rain, cold, hot, { temperature: 18, condition: 'Clouds' }, { temperature: 10, condition: 'Windy' }, null];
    const moods = ['professional', 'casual', 'sporty', 'creative', 'romantic', 'unknown'];
    const outfits = [[tee, black], [pinkTop, jeans], [coat, tee, jeans], [tee], [coat, pinkTop, black]];
    for (const w of weathers) for (const m of moods) for (const items of outfits) {
        lines.push(mixNote({ items, weather: w, moodId: m, tryItItemIds: [], dustyDays: none }));
        lines.push(wearSavedLine({ items, weather: w, moodId: m }));
        lines.push(picksDoneLine(1, w, m), picksDoneLine(null, w, m), stylistLoadingLine(m, w));
    }
    for (const cat of Object.values(ClothingCategory)) {
        const p = piece(`p-${cat}`, cat, 'Navy', 'Thing');
        lines.push(dustyLine(p, 30), starterQuestion('Crew Neck T-Shirt', cat));
        for (const n of [0, 2, 5, 14]) lines.push(wornLine({ ...p, wearFrequency: n }));
    }
    for (const n of [0, 1, 3, 9]) lines.push(streakLine(n, true), streakLine(n, false));
    lines.push(forgottenSubtitle(3, 'fall'), goToSubtitle(jeans, 6), goToSubtitle(undefined, 0));
    for (const h of [2, 9, 14, 20]) lines.push(welcomeBackLine(new Date(2026, 9, 4, h)));
    lines.push(mixNote({ items: [coat, tee, jeans], weather: rain, moodId: 'casual', tryItItemIds: ['coat'], dustyDays: none }));
    lines.push(mixNote({ items: [tee, jeans], weather: null, moodId: 'casual', tryItItemIds: [], dustyDays: new Map([['jeans', 30]]) }));
    return lines;
}

describe('voice: house rules', () => {
    const lines = sampleLines();

    it('never uses em or en dashes', () => {
        lines.forEach((l) => expect(l, l).not.toMatch(/[—–]/));
    });

    it('keeps every line short', () => {
        lines.forEach((l) => expect(l.length, l).toBeLessThanOrEqual(72));
    });

    it('fills every placeholder', () => {
        lines.forEach((l) => expect(l, l).not.toMatch(/[{}]|undefined|NaN/));
    });

    it('is stable for the same context (no flicker on re-render)', () => {
        expect(mixNote({ items: [pinkTop, jeans], weather: hot, moodId: 'casual', tryItItemIds: [], dustyDays: none }))
            .toBe(mixNote({ items: [pinkTop, jeans], weather: hot, moodId: 'casual', tryItItemIds: [], dustyDays: none }));
    });
});

describe('voice: says something specific', () => {
    it('reads the weather', () => {
        expect(weatherKind(rain)).toBe('rain');
        expect(weatherKind(cold)).toBe('cold');
        expect(weatherKind(hot)).toBe('hot');
    });

    it('suggests a layer when it is cold and there is none', () => {
        expect(mixNote({ items: [tee, jeans], weather: cold, moodId: 'casual', tryItItemIds: [], dustyDays: none })).toMatch(/layer/i);
    });

    it('suggests skipping the layer when it is hot', () => {
        expect(mixNote({ items: [coat, tee, jeans], weather: hot, moodId: 'casual', tryItItemIds: [], dustyDays: none })).toMatch(/skip the layer|leave the wool coat/i);
    });

    it('celebrates a piece the user wanted to try, by name', () => {
        expect(mixNote({ items: [pinkTop, jeans], weather: null, moodId: 'casual', tryItItemIds: ['pink'], dustyDays: none })).toContain('pink silk blouse');
    });

    it('mentions a dusty piece and its days on the shelf', () => {
        const line = dustyLine(jeans, 44);
        expect(line).toContain('44');
    });

    it('never puts an article or a singular verb on a piece name (names can be plural)', () => {
        expect(starterQuestion('Slim Jeans', ClothingCategory.Bottoms)).not.toMatch(/\ba slim jeans\b/i);
        const jeansLines = [
            goToSubtitle(jeans, 4),
            wearSavedLine({ items: [jeans, tee], weather: null, moodId: 'casual', dustyDays: new Map([['jeans', 30]]) }),
            mixNote({ items: [tee, jeans], weather: null, moodId: 'casual', tryItItemIds: ['jeans'], dustyDays: none }),
            mixNote({ items: [tee, jeans], weather: null, moodId: 'casual', tryItItemIds: [], dustyDays: new Map([['jeans', 30]]) }),
        ];
        jeansLines.forEach((l) => expect(l, l).not.toMatch(/blue slim jeans (is|leads|returns|says|brings|gets)\b/));
    });

    it('fits the send-off to the weather when saving', () => {
        expect(wearSavedLine({ items: [tee, jeans], weather: rain, moodId: 'casual' })).toMatch(/^Saved\. .*(dry|Umbrella|Rain)/);
    });
});

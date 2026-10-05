import { describe, expect, it } from 'vitest';
import { ClothingCategory, Season, type ClothingItem, type WearRecord } from '../../types';
import { computeWeeklyRecap } from '../weeklyRecap';
import { loggedTodayKeys, outfitKey, wornOn, wornToday } from '../wearLog';
import { itemName } from '../itemName';

const now = new Date(2026, 9, 5, 18);
const rec = (ids: string[], date: Date): WearRecord => ({ id: ids.join(), date, outfitItems: ids, mood: 'casual', weather: null });

describe('wearLog', () => {
    const outfits = [rec(['tee', 'jeans'], new Date(2026, 9, 5, 8)), rec(['coat', 'skirt'], new Date(2026, 9, 4, 20))];

    it('matches an outfit logged today in any item order', () => {
        expect(wornToday(outfits, ['jeans', 'tee'], now)).toBe(true);
    });

    it('ignores outfits from other days and different combos', () => {
        expect(wornToday(outfits, ['coat', 'skirt'], now)).toBe(false);
        expect(wornToday(outfits, ['tee', 'skirt'], now)).toBe(false);
        expect(loggedTodayKeys(outfits, now)).toEqual(new Set([outfitKey(['tee', 'jeans'])]));
    });

    it('checks any given day, for past-day logging', () => {
        expect(wornOn(outfits, ['coat', 'skirt'], new Date(2026, 9, 4, 9))).toBe(true);
        expect(wornOn(outfits, ['coat', 'skirt'], now)).toBe(false);
    });

    it('never treats an empty outfit as worn', () => {
        expect(wornToday(outfits, [], now)).toBe(false);
    });
});

describe('itemName', () => {
    it('adds the colour once', () => {
        expect(itemName({ color: 'Navy', subcategory: 'Striped Shirt' })).toBe('Navy Striped Shirt');
        expect(itemName({ color: 'Navy', subcategory: 'Navy Striped Shirt' })).toBe('Navy Striped Shirt');
        expect(itemName({ color: 'navy', subcategory: 'Navy Striped Shirt' })).toBe('Navy Striped Shirt');
    });

    it('drops an unknown colour', () => {
        expect(itemName({ color: 'Unknown', subcategory: 'Jacket' })).toBe('Jacket');
    });
});

describe('weeklyRecap', () => {
    const day = (d: number, h = 12) => new Date(2026, 9, d, h);
    const item = (id: string, color: string, added: Date): ClothingItem => ({
        id, color, colorHex: '#000', subcategory: id, category: ClothingCategory.Tops, imageUrl: '', season: [Season.Fall],
        wearFrequency: 1, lastWorn: null, dateAdded: added, aiTags: [],
    });
    const coat = item('coat', 'Camel', new Date(2026, 6, 1));
    const tee = item('tee', 'White', new Date(2026, 6, 1));
    const fresh = item('fresh', 'Navy', day(3));
    const log = (ids: string[], date: Date): WearRecord => ({ id: ids.join() + date.getTime(), date, outfitItems: ids, mood: 'casual', weather: null });

    it('counts this week only and spots pieces back after 3+ weeks', () => {
        const outfits = [
            log(['tee'], new Date(2026, 8, 30)), // last week
            log(['coat', 'tee'], day(6)), // Tue: coat last worn in August
            log(['coat'], new Date(2026, 7, 1)),
            log(['tee', 'fresh'], day(7)), // fresh was only added on the 3rd
        ];
        const recap = computeWeeklyRecap([coat, tee, fresh], outfits, day(8));
        expect(recap.outfits).toBe(2);
        expect(recap.daysLogged).toBe(2);
        expect(recap.rediscovered.map((i) => i.id)).toEqual(['coat']);
        expect(recap.topColor?.name).toBe('White');
    });
});

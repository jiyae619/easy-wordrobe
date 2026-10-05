import { describe, expect, it } from 'vitest';
import type { WearRecord } from '../../types';
import { streakGoal } from '../streakGoal';
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

describe('streakGoal', () => {
    it('aims at the next milestone', () => {
        expect(streakGoal(0)).toMatchObject({ target: 3, left: 3, progress: 0 });
        expect(streakGoal(4)).toMatchObject({ target: 7, name: 'a full week', left: 3 });
        expect(streakGoal(7).target).toBe(14);
        expect(streakGoal(120)).toMatchObject({ target: 200, left: 80 });
    });
});

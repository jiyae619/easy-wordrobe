import { describe, expect, it } from 'vitest';
import { ClothingCategory, Season, type ClothingItem, type OutfitSuggestion } from '../../types';
import { MOODS } from '../../data/moods';
import {
    assembleCodeSlots,
    buildReelOptions,
    isValidOutfit,
    itemsFromSlots,
    lightness,
    pickLookForLocks,
    slotsFromItems,
    wrapIndex,
} from '../outfitSlots';

let seq = 0;
function item(category: ClothingCategory, overrides: Partial<ClothingItem> = {}): ClothingItem {
    seq += 1;
    return {
        id: `${category}-${seq}`,
        imageUrl: '/catalog-images/x.webp',
        category,
        subcategory: category,
        color: 'Black',
        colorHex: '#000000',
        season: [Season.Spring, Season.Fall],
        wearFrequency: 0,
        lastWorn: null,
        dateAdded: new Date(2026, 0, seq),
        aiTags: [],
        ...overrides,
    };
}

const top = item(ClothingCategory.Tops);
const coat = item(ClothingCategory.Outerwear);
const jeans = item(ClothingCategory.Bottoms);
const dress = item(ClothingCategory.Dresses);
const shoes = item(ClothingCategory.Shoes);
const clothes = [top, coat, jeans, dress, shoes];

const look = (items: ClothingItem[]): OutfitSuggestion => ({
    id: items.map((i) => i.id).join('+'), items, mood: MOODS[0], weatherMatch: 0, wearScore: 0, explanation: '',
});

describe('outfit slots', () => {
    it('builds reel options with explicit "none" choices where a slot is optional', () => {
        const o = buildReelOptions(clothes);
        expect(o.layer).toEqual([null, coat]);
        expect(o.top).toEqual([top, null]);
        expect(o.bottom).toEqual([jeans, dress]);
        expect(o.shoes).toEqual([shoes, null]);
        expect(buildReelOptions([top, jeans]).shoes).toEqual([]);
    });

    it('round-trips items through slots and ignores the top under a dress', () => {
        expect(slotsFromItems([coat, top, jeans, shoes])).toEqual({ layer: coat.id, top: top.id, bottom: jeans.id, shoes: shoes.id });
        const withDress = itemsFromSlots({ layer: coat.id, top: top.id, bottom: dress.id, shoes: null }, clothes);
        expect(withDress.map((i) => i.id)).toEqual([coat.id, dress.id]);
    });

    it('enforces the Stylist composition rules', () => {
        expect(isValidOutfit([top, jeans])).toBe(true);
        expect(isValidOutfit([coat, jeans])).toBe(true);
        expect(isValidOutfit([dress])).toBe(true);
        expect(isValidOutfit([jeans, shoes])).toBe(false);
        expect(isValidOutfit([top, shoes])).toBe(false);
    });

    it('prefers the AI look that keeps the most locked pieces, walking from the cursor', () => {
        const otherTop = item(ClothingCategory.Tops);
        const looks = [look([top, jeans]), look([otherTop, jeans]), look([coat, dress])];
        expect(pickLookForLocks(looks, { top: otherTop.id }, 0)).toBe(1);
        expect(pickLookForLocks(looks, {}, 2)).toBe(2);
        expect(pickLookForLocks([], {}, 0)).toBe(-1);
    });

    it('assembles a valid code look that keeps locks and favours priority items', () => {
        const neglected = item(ClothingCategory.Tops);
        const all = [...clothes, neglected];
        const slots = assembleCodeSlots(buildReelOptions(all), { bottom: jeans.id }, new Set([neglected.id]), 12, 0);
        expect(slots.bottom).toBe(jeans.id);
        expect(slots.top).toBe(neglected.id);
        expect(isValidOutfit(itemsFromSlots(slots, all))).toBe(true);
    });

    it('wraps indices and orders colours by lightness', () => {
        expect(wrapIndex(-1, 4)).toBe(3);
        expect(wrapIndex(5, 4)).toBe(1);
        expect(lightness('#FFFFFF')).toBeGreaterThan(lightness('#1E1E1E'));
        expect(lightness('not-a-colour')).toBe(0.5);
    });
});

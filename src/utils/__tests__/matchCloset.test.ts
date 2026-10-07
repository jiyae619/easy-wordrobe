import { describe, expect, it } from 'vitest';
import { ClothingCategory, Season, type ClothingItem } from '../../types';
import { bestClosetMatch } from '../matchCloset';

const owned = (id: string, category: ClothingCategory, color: string, colorHex: string, subcategory: string): ClothingItem => ({
    id, category, color, colorHex, subcategory, imageUrl: '', season: [Season.Fall], wearFrequency: 0, lastWorn: null, dateAdded: new Date(2026, 0, 1), aiTags: [],
});
const closet = [
    owned('jeans', ClothingCategory.Bottoms, 'Blue', '#3A5A8C', 'Slim Jeans'),
    owned('chinos', ClothingCategory.Bottoms, 'Beige', '#D8C3A5', 'Chinos'),
    owned('tee', ClothingCategory.Tops, 'White', '#FFFFFF', 'Crew Neck T-Shirt'),
    owned('cardigan', ClothingCategory.Outerwear, 'Olive', '#6B7B3A', 'Cardigan'),
];

describe('bestClosetMatch', () => {
    it('finds the same piece from a photo even with a slightly different name', () => {
        expect(bestClosetMatch({ category: ClothingCategory.Bottoms, color: 'Blue', colorHex: '#3B5B8A', subcategory: 'Skinny Jeans' }, closet)?.id).toBe('jeans');
        expect(bestClosetMatch({ category: ClothingCategory.Tops, color: 'White', colorHex: '#FAFAFA', subcategory: 'T-Shirt' }, closet)?.id).toBe('tee');
    });

    it('lets a top and a layer stand in for each other', () => {
        expect(bestClosetMatch({ category: ClothingCategory.Tops, color: 'Olive', colorHex: '#6B7B3A', subcategory: 'Knit Cardigan' }, closet)?.id).toBe('cardigan');
    });

    it('offers a new piece rather than a wrong guess', () => {
        expect(bestClosetMatch({ category: ClothingCategory.Bottoms, color: 'Red', colorHex: '#C0392B', subcategory: 'Mini Skirt' }, closet)).toBeNull();
        expect(bestClosetMatch({ category: ClothingCategory.Shoes, color: 'White', colorHex: '#FFFFFF', subcategory: 'Sneakers' }, closet)).toBeNull();
    });

    it('never matches the same closet piece twice', () => {
        expect(bestClosetMatch({ category: ClothingCategory.Bottoms, color: 'Blue', colorHex: '#3A5A8C', subcategory: 'Jeans' }, closet, new Set(['jeans']))).toBeNull();
    });
});

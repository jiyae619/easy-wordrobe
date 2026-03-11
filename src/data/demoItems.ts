/**
 * Auto-generated Demo Items
 * -------------------------
 * Uses Vite's import.meta.glob to discover all images in src/assets/demo-images/
 * and automatically builds DEMO_ITEMS from filenames.
 *
 * Naming convention: {category}-{color}-{subcategory words}.{jpg|png|webp}
 * Example: tops-white-tshirt.jpg → Category: Tops, Color: White, Subcategory: Tshirt
 *
 * To add a new demo item: just drop a correctly-named image into src/assets/demo-images/
 */

import { type ClothingItem, ClothingCategory, Season } from '../types';
import { subDays } from 'date-fns';

// --- Eagerly import all images at build time ---
const imageModules = import.meta.glob<string>(
    '/src/assets/demo-images/*.{jpg,jpeg,png,webp}',
    { eager: true, query: '?url', import: 'default' }
);

// --- Lookup tables ---

const categoryMap: Record<string, ClothingCategory> = {
    tops: ClothingCategory.Tops,
    bottoms: ClothingCategory.Bottoms,
    outerwear: ClothingCategory.Outerwear,
    dresses: ClothingCategory.Dresses,
    shoes: ClothingCategory.Shoes,
    accessories: ClothingCategory.Accessories,
    bags: ClothingCategory.Bags,
};

const colorHexMap: Record<string, string> = {
    white: '#FFFFFF',
    black: '#000000',
    grey: '#9ca3af',
    gray: '#9ca3af',
    blue: '#3b82f6',
    navy: '#1e3a8a',
    red: '#ef4444',
    green: '#22c55e',
    brown: '#78350f',
    beige: '#d2b48c',
    cream: '#fef3c7',
    pink: '#ec4899',
    orange: '#f97316',
    yellow: '#eab308',
    purple: '#a855f7',
    olive: '#6b7f5e',
};

const seasonMap: Record<string, Season[]> = {
    tops: [Season.Spring, Season.Summer, Season.Fall],
    bottoms: [Season.Spring, Season.Fall, Season.Winter],
    outerwear: [Season.Fall, Season.Winter],
    dresses: [Season.Spring, Season.Summer],
    shoes: [Season.Spring, Season.Summer, Season.Fall, Season.Winter],
    accessories: [Season.Fall, Season.Winter],
    bags: [Season.Spring, Season.Summer, Season.Fall, Season.Winter],
};

const tagMap: Record<string, string[]> = {
    tops: ['casual', 'essential'],
    bottoms: ['casual', 'staple'],
    outerwear: ['layering', 'warm'],
    dresses: ['elegant', 'versatile'],
    shoes: ['comfortable', 'daily'],
    accessories: ['accessory', 'style'],
    bags: ['utility', 'daily'],
};

// --- Build DEMO_ITEMS dynamically ---

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function parseFilename(filepath: string): {
    category: string;
    color: string;
    subcategory: string;
} | null {
    // Extract filename without extension from path like /src/assets/demo-images/tops-white-tshirt.jpg
    const match = filepath.match(/\/([^/]+)\.\w+$/);
    if (!match) return null;

    const basename = match[1]; // e.g. "tops-white-tshirt"
    const parts = basename.split('-');
    if (parts.length < 3) return null;

    const category = parts[0];
    const color = parts[1];
    const subcategory = parts.slice(2).join(' ');

    return { category, color, subcategory };
}

const now = new Date();

export const DEMO_ITEMS: ClothingItem[] = Object.entries(imageModules)
    .map(([filepath, imageUrl], index) => {
        const parsed = parseFilename(filepath);
        if (!parsed) return null;

        const { category, color, subcategory } = parsed;
        const clothingCategory = categoryMap[category];
        if (!clothingCategory) return null;

        const item: ClothingItem = {
            id: `demo-auto-${index}`,
            imageUrl,
            category: clothingCategory,
            subcategory: capitalize(subcategory),
            color: capitalize(color),
            colorHex: colorHexMap[color.toLowerCase()] || '#9ca3af',
            pattern: 'Solid',
            season: seasonMap[category] || [Season.Spring, Season.Summer, Season.Fall, Season.Winter],
            wearFrequency: Math.floor(Math.random() * 30) + 1,
            lastWorn: subDays(now, Math.floor(Math.random() * 14) + 1),
            dateAdded: subDays(now, Math.floor(Math.random() * 90) + 10),
            aiTags: [...(tagMap[category] || ['item']), color.toLowerCase()],
        };
        return item;
    })
    .filter((item): item is ClothingItem => item !== null);


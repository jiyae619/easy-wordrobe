/**
 * Starter Closet Catalog
 * ----------------------
 * Pre-authored common staples for the swipe/O–X starter picker: new users accept
 * or reject cards instead of photographing items, and each accepted card becomes
 * a REAL wardrobe item (normal UUID — not a demo item) with exact metadata.
 *
 * Ground truth by construction: category/season/moods are hand-authored against
 * the app's own enums, and color name + hex come straight from COLOR_PALETTE, so
 * the intake model's measured error rate simply does not apply to these items.
 *
 * Images are curated FLUX.2 renders (see scripts/gen) served from
 * public/catalog-images/ as stable, non-hashed URLs — the same pattern as
 * demo-images. addClothingItem writes public paths to Firestore as-is (it only
 * uploads base64 to Storage), so no Storage cost or upload latency is involved.
 * The /catalog-images/ prefix also doubles as provenance: "still a stock photo"
 * is derivable from the URL, no schema field needed.
 */

import { ClothingCategory, Season, type ClothingItem } from '../types';
import { COLOR_PALETTE } from './colorPalette';

export interface StarterCatalogEntry {
    /** Stable slug — also the image filename stem: /catalog-images/{slug}-{color}.webp */
    slug: string;
    /** Card title shown in the picker */
    label: string;
    category: ClothingCategory;
    subcategory: string;
    /** Palette color NAMES (must exist in COLOR_PALETTE); the first is the card default. */
    colors: string[];
    season: Season[];
    /** Mood ids (VALID_MOODS vocabulary) applied as userMoods/aiTags on accept. */
    moods: string[];
}

const { Spring, Summer, Fall, Winter } = Season;

/**
 * The deck, GROUPED BY CATEGORY (Tops → Bottoms → Outerwear → Dresses) so the picker's
 * segmented category progress bar reads truthfully — contiguous groups are load-bearing
 * for that UI and locked by a test. Within each group, most-common staples come first;
 * the first Tops card + first Bottoms card alone satisfy the Stylist's composition rules.
 * Shoes cards join when their assets ship.
 */
export const STARTER_CATALOG: StarterCatalogEntry[] = [
    // --- Tops ---
    { slug: 'tops-crew-tee', label: 'Crew Neck T-Shirt', category: ClothingCategory.Tops, subcategory: 'Crew Neck T-Shirt', colors: ['White', 'Black', 'Grey', 'Navy', 'Olive'], season: [Spring, Summer, Fall], moods: ['casual'] },
    { slug: 'tops-hoodie', label: 'Hoodie', category: ClothingCategory.Tops, subcategory: 'Hoodie', colors: ['Grey', 'Black', 'Navy', 'Olive', 'Cream'], season: [Spring, Fall, Winter], moods: ['casual', 'sporty'] },
    { slug: 'tops-button-down', label: 'Button-Down Shirt', category: ClothingCategory.Tops, subcategory: 'Button-Down Shirt', colors: ['White', 'Blue', 'Black', 'Cream'], season: [Spring, Summer, Fall, Winter], moods: ['professional', 'casual'] },
    { slug: 'tops-knit-sweater', label: 'Knit Sweater', category: ClothingCategory.Tops, subcategory: 'Knit Sweater', colors: ['Cream', 'Navy', 'Grey', 'Brown'], season: [Fall, Winter], moods: ['casual'] },
    { slug: 'tops-silk-blouse', label: 'Silk Blouse', category: ClothingCategory.Tops, subcategory: 'Silk Blouse', colors: ['Cream', 'White', 'Black', 'Pink'], season: [Spring, Summer, Fall], moods: ['professional', 'romantic'] },
    // --- Bottoms ---
    { slug: 'bottoms-slim-jeans', label: 'Slim Jeans', category: ClothingCategory.Bottoms, subcategory: 'Slim Jeans', colors: ['Blue', 'Black', 'Grey', 'White'], season: [Spring, Summer, Fall, Winter], moods: ['casual'] },
    { slug: 'bottoms-chinos', label: 'Chinos', category: ClothingCategory.Bottoms, subcategory: 'Chinos', colors: ['Beige', 'Navy', 'Olive', 'Black'], season: [Spring, Fall, Winter], moods: ['casual', 'professional'] },
    { slug: 'bottoms-trousers', label: 'Trousers', category: ClothingCategory.Bottoms, subcategory: 'Tailored Trousers', colors: ['Black', 'Grey', 'Navy', 'Beige'], season: [Spring, Summer, Fall, Winter], moods: ['professional'] },
    { slug: 'bottoms-pleated-skirt', label: 'Pleated Skirt', category: ClothingCategory.Bottoms, subcategory: 'Pleated Skirt', colors: ['Black', 'Beige', 'Navy', 'Pink'], season: [Spring, Summer, Fall], moods: ['romantic', 'professional'] },
    { slug: 'bottoms-denim-shorts', label: 'Denim Shorts', category: ClothingCategory.Bottoms, subcategory: 'Denim Shorts', colors: ['Blue', 'Black', 'White'], season: [Summer], moods: ['casual', 'sporty'] },
    // --- Outerwear ---
    { slug: 'outerwear-denim-jacket', label: 'Denim Jacket', category: ClothingCategory.Outerwear, subcategory: 'Denim Jacket', colors: ['Blue', 'Black', 'White'], season: [Spring, Fall], moods: ['casual', 'creative'] },
    { slug: 'outerwear-cardigan', label: 'Cardigan', category: ClothingCategory.Outerwear, subcategory: 'Cardigan', colors: ['Grey', 'Beige', 'Navy', 'Olive'], season: [Spring, Fall, Winter], moods: ['casual', 'romantic'] },
    { slug: 'outerwear-blazer', label: 'Blazer', category: ClothingCategory.Outerwear, subcategory: 'Blazer', colors: ['Black', 'Navy', 'Beige', 'Grey'], season: [Spring, Fall, Winter], moods: ['professional'] },
    { slug: 'outerwear-wool-coat', label: 'Wool Coat', category: ClothingCategory.Outerwear, subcategory: 'Wool Coat', colors: ['Beige', 'Black', 'Grey', 'Navy'], season: [Fall, Winter], moods: ['professional'] },
    { slug: 'outerwear-puffer-parka', label: 'Puffer Jacket', category: ClothingCategory.Outerwear, subcategory: 'Puffer Parka', colors: ['Black', 'Olive', 'Cream', 'Brown'], season: [Winter], moods: ['casual', 'sporty'] },
    // --- Dresses ---
    { slug: 'dresses-wrap-dress', label: 'Wrap Dress', category: ClothingCategory.Dresses, subcategory: 'Wrap Dress', colors: ['Black', 'Navy', 'Olive', 'Pink'], season: [Spring, Summer, Fall], moods: ['romantic', 'professional'] },
    { slug: 'dresses-sundress', label: 'Sundress', category: ClothingCategory.Dresses, subcategory: 'Sundress', colors: ['White', 'Blue', 'Pink', 'Cream'], season: [Spring, Summer], moods: ['romantic', 'casual'] },
    // --- Shoes ---
    { slug: 'shoes-sneakers', label: 'Sneakers', category: ClothingCategory.Shoes, subcategory: 'Low-Top Sneakers', colors: ['White', 'Black', 'Grey', 'Navy'], season: [Spring, Summer, Fall], moods: ['casual', 'sporty'] },
    { slug: 'shoes-ankle-boots', label: 'Ankle Boots', category: ClothingCategory.Shoes, subcategory: 'Ankle Boots', colors: ['Black', 'Brown', 'Beige'], season: [Fall, Winter], moods: ['casual', 'professional'] },
    { slug: 'shoes-loafers', label: 'Loafers', category: ClothingCategory.Shoes, subcategory: 'Penny Loafers', colors: ['Brown', 'Black', 'Beige'], season: [Spring, Fall], moods: ['professional', 'casual'] },
];

/** Public URL of a catalog card's image for a given palette color name. */
export function catalogImageUrl(entry: StarterCatalogEntry, colorName: string): string {
    return `/catalog-images/${entry.slug}-${colorName.toLowerCase()}.webp`;
}

/**
 * True when an item still wears its catalog stock photo (provenance is the URL prefix by design —
 * no schema field). Replacing the photo with the user's own shot clears this automatically.
 */
export function isStockPhoto(item: Pick<ClothingItem, 'imageUrl'>): boolean {
    return item.imageUrl.startsWith('/catalog-images/');
}

export interface StarterDeckCard {
    entry: StarterCatalogEntry;
    /** Colors still offerable after de-duping against the existing wardrobe. */
    colors: string[];
}

/**
 * Build the deck the picker walks through: the catalog minus what the user already owns
 * (same subcategory + color ⇒ that color is dropped; a card with no colors left is skipped),
 * optionally filtered to specific categories (deep-links, e.g. "add a bottom" → bottoms only).
 */
export function buildStarterDeck(clothes: ClothingItem[], categories?: ClothingCategory[]): StarterDeckCard[] {
    const owned = new Set(clothes.map((c) => `${c.subcategory.toLowerCase()}|${c.color.toLowerCase()}`));
    return STARTER_CATALOG
        .filter((entry) => !categories || categories.includes(entry.category))
        .map((entry) => ({
            entry,
            colors: entry.colors.filter((color) => !owned.has(`${entry.subcategory.toLowerCase()}|${color.toLowerCase()}`)),
        }))
        .filter((card) => card.colors.length > 0);
}

/**
 * Materialize an accepted card as a wardrobe item payload for addClothingItem
 * (which assigns the real id and dateAdded). Color name AND hex are palette-exact;
 * colorSource is 'user' because the user affirmed the color — and with no aiColor
 * present, correction logging correctly never treats it as an AI guess.
 */
export function buildCatalogItem(
    entry: StarterCatalogEntry,
    colorName: string = entry.colors[0]
): Omit<ClothingItem, 'id' | 'dateAdded'> {
    const palette = COLOR_PALETTE.find((c) => c.name === colorName) ?? COLOR_PALETTE[0];
    return {
        imageUrl: catalogImageUrl(entry, palette.name),
        category: entry.category,
        subcategory: entry.subcategory,
        color: palette.name,
        colorHex: palette.hex,
        colorSource: 'user',
        season: [...entry.season],
        wearFrequency: 0,
        lastWorn: null,
        aiTags: [...entry.moods],
        userMoods: [...entry.moods],
        userNotes: '',
    };
}

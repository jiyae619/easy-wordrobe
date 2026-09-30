// Seeded, in-memory demo data for the Stylemax marketing capture.
// Dates are computed relative to "now" (Playwright pins the clock).
import type { ClothingItem, WearRecord, WeatherData, Season } from '/src/types/index';

export const DEMO_UID = 'demo-jiyae';

const DAY = 24 * 60 * 60 * 1000;
const now = () => Date.now();
/** A date `n` days ago at a given local hour. */
function daysAgo(n: number, hour = 8, minute = 30): Date {
    const d = new Date(now() - n * DAY);
    d.setHours(hour, minute, 0, 0);
    return d;
}

// Images are served from /u/jiyae/closet/* (a dev-server alias of public/catalog-images) so they
// read as the user's own uploaded photos rather than starter-catalog stock photos.
const img = (file: string) => `/u/jiyae/closet/${file}.webp`;

type Seed = {
    id: string; file: string; category: ClothingItem['category']; subcategory: string;
    color: string; colorHex: string; season: Season[]; moods: string[]; base: number;
    addedDaysAgo: number; lastWornDaysAgo?: number; tags?: string[];
};

const S = (s: Seed) => s;

const ITEMS: Seed[] = [
    // Tops
    S({ id: 'top-white-tee', file: 'tops-crew-tee-white', category: 'tops', subcategory: 'Crew Neck Tee', color: 'White', colorHex: '#F4F4F2', season: ['spring', 'summer', 'fall'], moods: ['casual', 'sporty'], base: 5, addedDaysAgo: 164, tags: ['basic', 'cotton', 'everyday'] }),
    S({ id: 'top-black-tee', file: 'tops-crew-tee-black', category: 'tops', subcategory: 'Crew Neck Tee', color: 'Black', colorHex: '#1C1C1C', season: ['spring', 'summer', 'fall'], moods: ['casual', 'creative'], base: 7, addedDaysAgo: 164, tags: ['basic', 'minimal'] }),
    S({ id: 'top-blue-oxford', file: 'tops-button-down-blue', category: 'tops', subcategory: 'Oxford Button Down', color: 'Blue', colorHex: '#2F6FED', season: ['spring', 'fall'], moods: ['professional', 'casual'], base: 3, addedDaysAgo: 120, tags: ['smart casual', 'cotton'] }),
    S({ id: 'top-cream-knit', file: 'tops-knit-sweater-cream', category: 'tops', subcategory: 'Knit Sweater', color: 'Cream', colorHex: '#EFE7D3', season: ['fall', 'winter'], moods: ['casual', 'romantic'], base: 4, addedDaysAgo: 150, tags: ['cozy', 'knitwear'] }),
    S({ id: 'top-grey-hoodie', file: 'tops-hoodie-grey', category: 'tops', subcategory: 'Pullover Hoodie', color: 'Grey', colorHex: '#8B8F96', season: ['spring', 'fall', 'winter'], moods: ['sporty', 'casual'], base: 5, addedDaysAgo: 140, tags: ['athleisure', 'weekend'] }),
    S({ id: 'top-pink-blouse', file: 'tops-silk-blouse-pink', category: 'tops', subcategory: 'Silk Blouse', color: 'Pink', colorHex: '#E6A4BD', season: ['spring', 'summer', 'fall'], moods: ['romantic', 'creative'], base: 1, addedDaysAgo: 96, lastWornDaysAgo: 36, tags: ['silk', 'date night'] }),
    S({ id: 'top-navy-knit', file: 'tops-knit-sweater-navy', category: 'tops', subcategory: 'Crew Knit Sweater', color: 'Navy', colorHex: '#1B2A4A', season: ['fall', 'winter'], moods: ['professional', 'casual'], base: 3, addedDaysAgo: 150, tags: ['knitwear', 'office'] }),
    S({ id: 'top-white-shirt', file: 'tops-button-down-white', category: 'tops', subcategory: 'Button Down Shirt', color: 'White', colorHex: '#F4F4F2', season: ['spring', 'summer', 'fall', 'winter'], moods: ['professional'], base: 4, addedDaysAgo: 160, tags: ['crisp', 'office'] }),
    // Bottoms
    S({ id: 'bot-blue-jeans', file: 'bottoms-slim-jeans-blue', category: 'bottoms', subcategory: 'Slim Jeans', color: 'Blue', colorHex: '#2F6FED', season: ['spring', 'summer', 'fall', 'winter'], moods: ['casual', 'creative'], base: 6, addedDaysAgo: 164, tags: ['denim', 'everyday'] }),
    S({ id: 'bot-black-jeans', file: 'bottoms-slim-jeans-black', category: 'bottoms', subcategory: 'Slim Jeans', color: 'Black', colorHex: '#1C1C1C', season: ['spring', 'fall', 'winter'], moods: ['casual', 'creative'], base: 5, addedDaysAgo: 130, tags: ['denim', 'night out'] }),
    S({ id: 'bot-beige-trousers', file: 'bottoms-trousers-beige', category: 'bottoms', subcategory: 'Tailored Trousers', color: 'Beige', colorHex: '#D8C7A3', season: ['spring', 'fall'], moods: ['professional', 'casual'], base: 3, addedDaysAgo: 110, tags: ['tailored', 'office'] }),
    S({ id: 'bot-grey-trousers', file: 'bottoms-trousers-grey', category: 'bottoms', subcategory: 'Wool Trousers', color: 'Grey', colorHex: '#8B8F96', season: ['fall', 'winter'], moods: ['professional'], base: 2, addedDaysAgo: 110, tags: ['tailored', 'wool'] }),
    S({ id: 'bot-navy-skirt', file: 'bottoms-pleated-skirt-navy', category: 'bottoms', subcategory: 'Pleated Midi Skirt', color: 'Navy', colorHex: '#1B2A4A', season: ['spring', 'fall'], moods: ['romantic', 'creative'], base: 1, addedDaysAgo: 88, lastWornDaysAgo: 33, tags: ['pleats', 'feminine'] }),
    // Outerwear
    S({ id: 'out-denim-jacket', file: 'outerwear-denim-jacket-blue', category: 'outerwear', subcategory: 'Denim Jacket', color: 'Blue', colorHex: '#2F6FED', season: ['spring', 'fall'], moods: ['casual', 'creative'], base: 2, addedDaysAgo: 160, lastWornDaysAgo: 45, tags: ['denim', 'layering', 'weekend'] }),
    S({ id: 'out-beige-blazer', file: 'outerwear-blazer-beige', category: 'outerwear', subcategory: 'Tailored Blazer', color: 'Beige', colorHex: '#D8C7A3', season: ['spring', 'fall'], moods: ['professional', 'creative'], base: 3, addedDaysAgo: 120, tags: ['tailored', 'smart'] }),
    S({ id: 'out-olive-cardigan', file: 'outerwear-cardigan-olive', category: 'outerwear', subcategory: 'Knit Cardigan', color: 'Olive', colorHex: '#6B7233', season: ['spring', 'fall', 'winter'], moods: ['casual', 'romantic'], base: 4, addedDaysAgo: 140, tags: ['cozy', 'layering'] }),
    S({ id: 'out-camel-coat', file: 'outerwear-wool-coat-beige', category: 'outerwear', subcategory: 'Wool Coat', color: 'Beige', colorHex: '#D8C7A3', season: ['fall', 'winter'], moods: ['professional', 'romantic'], base: 6, addedDaysAgo: 300, tags: ['wool', 'classic'] }),
    // Dresses
    S({ id: 'dress-black-wrap', file: 'dresses-wrap-dress-black', category: 'dresses', subcategory: 'Wrap Dress', color: 'Black', colorHex: '#1C1C1C', season: ['spring', 'summer', 'fall'], moods: ['romantic', 'professional'], base: 3, addedDaysAgo: 130, tags: ['date night', 'elegant'] }),
    S({ id: 'dress-olive-slip', file: 'dresses-wrap-dress-olive', category: 'dresses', subcategory: 'Slip Dress', color: 'Olive', colorHex: '#6B7233', season: ['spring', 'summer', 'fall'], moods: ['romantic', 'creative'], base: 1, addedDaysAgo: 92, lastWornDaysAgo: 41, tags: ['satin', 'layering'] }),
    // Shoes
    S({ id: 'shoe-white-sneakers', file: 'shoes-sneakers-white', category: 'shoes', subcategory: 'Leather Sneakers', color: 'White', colorHex: '#F4F4F2', season: ['spring', 'summer', 'fall', 'winter'], moods: ['casual', 'sporty'], base: 12, addedDaysAgo: 164, tags: ['everyday', 'minimal'] }),
    S({ id: 'shoe-brown-loafers', file: 'shoes-loafers-brown', category: 'shoes', subcategory: 'Penny Loafers', color: 'Brown', colorHex: '#6F4E37', season: ['spring', 'fall'], moods: ['professional', 'romantic'], base: 4, addedDaysAgo: 120, tags: ['leather', 'classic'] }),
    S({ id: 'shoe-black-boots', file: 'shoes-ankle-boots-black', category: 'shoes', subcategory: 'Ankle Boots', color: 'Black', colorHex: '#1C1C1C', season: ['fall', 'winter'], moods: ['creative', 'casual'], base: 4, addedDaysAgo: 150, tags: ['leather', 'edgy'] }),
];

// ~3 weeks of logged outfits: a 12-day streak up to yesterday (today not logged yet), two gap days.
const HISTORY: Array<{ d: number; items: string[]; mood: string; t: number; c: string; fav?: boolean }> = [
    { d: 1, items: ['out-beige-blazer', 'top-white-shirt', 'bot-beige-trousers', 'shoe-brown-loafers'], mood: 'professional', t: 17, c: 'Mostly Sunny', fav: true },
    { d: 2, items: ['top-grey-hoodie', 'bot-blue-jeans', 'shoe-white-sneakers'], mood: 'casual', t: 16, c: 'Partly Cloudy' },
    { d: 3, items: ['top-cream-knit', 'bot-black-jeans', 'shoe-black-boots'], mood: 'casual', t: 14, c: 'Cloudy' },
    { d: 4, items: ['out-olive-cardigan', 'top-white-tee', 'bot-blue-jeans', 'shoe-white-sneakers'], mood: 'casual', t: 19, c: 'Sunny' },
    { d: 5, items: ['out-beige-blazer', 'top-black-tee', 'bot-black-jeans', 'shoe-black-boots'], mood: 'creative', t: 18, c: 'Partly Cloudy', fav: true },
    { d: 6, items: ['top-blue-oxford', 'bot-grey-trousers', 'shoe-brown-loafers'], mood: 'professional', t: 15, c: 'Light Rain' },
    { d: 7, items: ['top-white-tee', 'bot-blue-jeans', 'shoe-white-sneakers'], mood: 'casual', t: 21, c: 'Sunny' },
    { d: 8, items: ['out-camel-coat', 'dress-black-wrap', 'shoe-black-boots'], mood: 'romantic', t: 13, c: 'Clear' },
    { d: 9, items: ['top-navy-knit', 'bot-beige-trousers', 'shoe-brown-loafers'], mood: 'professional', t: 16, c: 'Cloudy' },
    { d: 10, items: ['top-white-tee', 'bot-black-jeans', 'shoe-white-sneakers'], mood: 'casual', t: 22, c: 'Sunny' },
    { d: 11, items: ['top-grey-hoodie', 'bot-blue-jeans', 'shoe-white-sneakers'], mood: 'sporty', t: 20, c: 'Mostly Sunny' },
    { d: 12, items: ['out-olive-cardigan', 'top-white-tee', 'bot-blue-jeans', 'shoe-white-sneakers'], mood: 'casual', t: 18, c: 'Partly Cloudy' },
    // day 13: no log (streak starts at day 12)
    { d: 14, items: ['top-white-shirt', 'bot-grey-trousers', 'shoe-brown-loafers'], mood: 'professional', t: 19, c: 'Sunny' },
    { d: 15, items: ['top-black-tee', 'bot-blue-jeans', 'shoe-white-sneakers'], mood: 'casual', t: 23, c: 'Sunny' },
    { d: 17, items: ['top-white-tee', 'bot-beige-trousers', 'shoe-white-sneakers'], mood: 'casual', t: 24, c: 'Sunny' },
    { d: 18, items: ['top-cream-knit', 'bot-blue-jeans', 'shoe-white-sneakers'], mood: 'casual', t: 20, c: 'Partly Cloudy' },
    { d: 19, items: ['top-blue-oxford', 'bot-black-jeans', 'shoe-brown-loafers'], mood: 'professional', t: 22, c: 'Mostly Sunny' },
    { d: 20, items: ['top-white-tee', 'bot-blue-jeans', 'shoe-white-sneakers'], mood: 'casual', t: 25, c: 'Sunny' },
];

function weatherFor(t: number, c: string): WeatherData {
    return { temperature: t, feelsLike: t - 1, condition: c, humidity: 58, windSpeed: 11, location: 'New York, NY' };
}

export function buildOutfits(): WearRecord[] {
    return HISTORY.map((h) => ({
        id: `wear-${String(h.d).padStart(2, '0')}`,
        date: daysAgo(h.d, 8, 10 + (h.d * 7) % 40),
        outfitItems: h.items,
        mood: h.mood,
        weather: weatherFor(h.t, h.c),
        ...(h.fav ? { favorite: true } : {}),
    }));
}

export function buildWardrobe(): ClothingItem[] {
    const outfits = buildOutfits();
    return ITEMS.map((s) => {
        const wornIn = outfits.filter((o) => o.outfitItems.includes(s.id));
        const lastFromHistory = wornIn.length > 0
            ? new Date(Math.max(...wornIn.map((o) => o.date.getTime())))
            : null;
        const lastWorn = lastFromHistory ?? (s.lastWornDaysAgo != null ? daysAgo(s.lastWornDaysAgo, 9) : null);
        return {
            id: s.id,
            imageUrl: img(s.file),
            thumbnailUrl: img(s.file),
            thumbnailVersion: 2,
            category: s.category,
            subcategory: s.subcategory,
            color: s.color,
            colorHex: s.colorHex,
            aiColor: { name: s.color, hex: s.colorHex },
            colorSource: 'ai',
            season: s.season,
            wearFrequency: s.base + wornIn.length,
            lastWorn,
            dateAdded: daysAgo(s.addedDaysAgo, 19),
            aiTags: [...(s.tags ?? []), ...s.moods],
            userMoods: s.moods,
            userNotes: '',
            scanItemCount: 1,
        } as ClothingItem;
    });
}

export const DEMO_WEATHER: WeatherData = {
    temperature: 18,
    feelsLike: 17,
    condition: 'Partly Cloudy',
    humidity: 62,
    windSpeed: 13,
    location: 'New York, NY',
};

/**
 * Core Type Definitions for Wardrobe AI
 * -------------------------------------
 * This file contains all the TypeScript interfaces and enums used throughout the application.
 * Each type represents a core data structure for managing the wardrobe, outfits, weather, and user insights.
 */

import { type UserSettings } from '../services/firestoreService';

// ==========================================
// 1. Enums & Constants
// ==========================================

/**
 * Categories for clothing items.
 * Used to organize the wardrobe and filter suggestions.
 */
export const ClothingCategory = {
    Tops: "tops",
    Bottoms: "bottoms",
    Outerwear: "outerwear",
    Dresses: "dresses",
} as const;

export type ClothingCategory = typeof ClothingCategory[keyof typeof ClothingCategory];

/**
 * Seasons for clothing suitability.
 * An item can be suitable for multiple seasons (e.g., T-shirt for Summer and Spring).
 */
export const Season = {
    Spring: "spring",
    Summer: "summer",
    Fall: "fall",
    Winter: "winter",
} as const;

export type Season = typeof Season[keyof typeof Season];

/**
 * Normalized bounding box for a detected clothing item.
 * All values are in [0, 1] relative to the original image size.
 */
export interface ItemBoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FocusPoint {
    x: number;
    y: number;
}

export interface FocusRoi {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Represents a single item of clothing in the user's wardrobe.
 */
export interface ClothingItem {
    /** Unique identifier (UUID) */
    id: string;
    /** URL to the image (local blob or remote URL) */
    imageUrl: string;
    /** Broad category of the item */
    category: ClothingCategory;
    /** Specific type (e.g., "crew neck", "denim jeans") */
    subcategory: string;
    /** Primary color name detected by AI or set by user */
    color: string;
    /** Hex code for the primary color (raw — kept exactly as detected/measured, never snapped) */
    colorHex: string;
    /** The model's first color detection, before snap-to-palette or any user fix (immutable) */
    aiColor?: { name: string; hex: string };
    /** Whether `color` is the AI's snapped guess or a user correction */
    colorSource?: 'ai' | 'user';
    /** List of seasons this item is suitable for */
    season: Season[];
    /** Number of times this item has been worn */
    wearFrequency: number;
    /** Date when the item was last worn */
    lastWorn: Date | null;
    /** Date when the item was added to the wardrobe */
    dateAdded: Date;
    /** AI-generated tags for better search and categorization (mood/style tags) */
    aiTags: string[];
    /** Mood IDs the user selected when adding the item (from upload chips). Used to prioritize outfit suggestions. */
    userMoods?: string[];
    /** Optional personal notes about the item */
    userNotes?: string;
    /** Optional original full-frame image when catalog image is a crop */
    sourceImageUrl?: string;
    /** Optional model-provided item localization (normalized) */
    detectionBox?: ItemBoundingBox;
    /** Optional model confidence (0..1) for the localization result */
    detectionConfidence?: number;
    /** Optional thumbnail image url for future display overrides */
    thumbnailUrl?: string;
    /** Version marker for one-time thumbnail migrations */
    thumbnailVersion?: number;
    /** Number of items detected in the originating scan (if scanned) */
    scanItemCount?: number;
    /** Optional user-calibrated focus point in percentage coordinates */
    focusPoint?: FocusPoint;
    /** Optional user-calibrated focus zoom multiplier */
    focusZoom?: number;
    /** Optional user-calibrated crop region in percentage coordinates */
    focusRoi?: FocusRoi;
}

/**
 * A user's correction of an AI-detected color.
 * One record per correction — accumulates into the offline eval / fine-tune dataset.
 */
export interface ColorCorrection {
    id: string;
    itemId: string;
    /** Image the correction refers to (the item's imageUrl). */
    imageRef: string;
    /** The model's first guess: raw color name + hex, before snapping. */
    aiColor: { name: string; hex: string };
    /** The human-verified color the user chose. */
    userColor: { name: string; hex: string };
    /** Vision provider id that produced the AI guess (e.g. "nova-2-lite"). */
    model: string;
    createdAt: Date;
}

/**
 * Represents a fashion mood or style aesthetic.
 * Used to filter outfit suggestions based on the user's current vibe.
 */
export interface FashionMood {
    id: string;
    /** Name of the mood (e.g., "Minimal Chic", "Street Style") */
    name: string;
    /** Description of the style */
    description: string;
    /** Array of hex colors associated with this mood */
    colorPalette: string[];
    /** URL for a representative image of this mood */
    previewImageUrl: string;
    /** Tags associated with this mood */
    tags: string[];
}

/**
 * Weather data structure from OpenWeatherMap or similar API.
 */
export interface WeatherData {
    /** Current temperature in Celsius or Fahrenheit */
    temperature: number;
    /** "Feels like" temperature */
    feelsLike: number;
    /** Description of the weather (e.g., "Sunny", "Rainy") */
    condition: string;
    /** Humidity percentage (0-100) */
    humidity: number;
    /** Wind speed in km/h or mph */
    windSpeed: number;
    /** Location name (city) */
    location: string;
}

export interface WeatherOutlookPeriod {
    label: 'morning' | 'daytime' | 'evening';
    temperature: number;
    condition: string;
}

/**
 * An outfit suggested by the AI.
 */
export interface OutfitSuggestion {
    id: string;
    /** List of clothing items that make up the outfit */
    items: ClothingItem[];
    /** The mood this outfit aligns with */
    mood: FashionMood;
    /** Score (0-100) indicating how well it matches the current weather */
    weatherMatch: number;
    /** Reason why this outfit was suggested */
    explanation: string;
    /** Priority score based on wear frequency (higher for less worn items if trying to rotate) */
    wearScore: number;
}

/**
 * Record of an outfit worn on a specific date.
 */
export interface WearRecord {
    id: string;
    /** Date the outfit was worn */
    date: Date;
    /** IDs of the clothing items worn */
    outfitItems: string[];
    /** ID or name of the mood for that day */
    mood: string;
    /** Weather conditions on that day */
    weather: WeatherData;
}

/**
 * Data for the user insights dashboard.
 */
export interface UserInsight {
    /** Most frequently worn colors */
    mostWornColors: { color: string; hex: string; count: number }[];
    /** Most frequently worn specific items */
    mostWornItems: { item: ClothingItem; count: number }[];
    /** Items that haven't been worn much */
    leastWornItems: ClothingItem[];
    /** Behavioral nudges or suggestions (e.g., "You haven't worn your blue shirt in a while") */
    suggestedVariations: string[];
    /** Weekly wear frequency pattern */
    weeklyWearPattern: { day: string; count: number }[];
}

// ==========================================
// 3. Context & State Management
// ==========================================

/**
 * The shape of the global Wardrobe Context.
 * Includes data state and functions to modify it.
 */
export interface WardrobeContextType {
    /** List of all clothing items */
    clothes: ClothingItem[];
    /** History of worn outfits */
    outfits: WearRecord[];
    /** Currently selected fashion mood */
    currentMood: FashionMood | null;
    /** Current weather data */
    weather: WeatherData | null;

    /** Loading state for async operations */
    isLoading: boolean;
    /** Error message if any operation fails */
    error: string | null;
    /** Clear the error message */
    clearError: () => void;

    // --- CRUD Operations (async — writes to Firestore) ---

    /** Add a new clothing item to the wardrobe */
    addClothingItem: (item: Omit<ClothingItem, 'id' | 'dateAdded'>) => Promise<void>;

    /** Update an existing clothing item */
    updateClothingItem: (id: string, updates: Partial<ClothingItem>) => Promise<void>;

    /** Correct an item's color from the palette — updates the item and logs the {AI → user} pair as eval data */
    correctItemColor: (id: string, userColor: { name: string; hex: string }) => Promise<void>;

    /** Delete a clothing item by ID */
    deleteClothingItem: (id: string) => Promise<void>;

    /** Manually increment wear count (for adjustments) */
    incrementWearCount: (id: string) => Promise<void>;

    /** Manually decrement wear count (for adjustments) */
    decrementWearCount: (id: string) => Promise<void>;

    /** Log an outfit as worn today */
    logOutfitWear: (outfitItems: string[], moodId: string, weather: WeatherData) => Promise<void>;

    // --- State & Analysis ---

    /** Set the current fashion mood */
    setMood: (mood: FashionMood) => void;

    /** Refresh weather data based on location */
    refreshWeather: (lat: number, lon: number) => Promise<void>;

    /** Current AI-generated insights */
    insights: UserInsight | null;

    /** Calculate and return user insights based on current wardrobe state */
    fetchInsights: () => Promise<void>;

    /** Populate wardrobe with diverse demo data */
    populateDemoData: () => Promise<void>;

    /** IDs of items bookmarked to try next week */
    bookmarkedItems: string[];

    /** Bookmark an item for next week */
    bookmarkItem: (id: string) => void;

    /** Remove a bookmark */
    unbookmarkItem: (id: string) => void;

    /** User profile settings from Firestore */
    userSettings: UserSettings | null;

    /** Update user profile settings */
    updateUserSettings: (updates: Partial<UserSettings>) => Promise<void>;

    /** IDs of items the user tapped "Try it" on from the Insights page */
    tryItItemIds: string[];

    /** Save a "Try it" intent for an item — persisted to Firestore and fed into StylistAgent */
    addTryItItem: (itemId: string) => Promise<void>;

    /** Remove a "Try it" intent */
    removeTryItItem: (itemId: string) => Promise<void>;
}

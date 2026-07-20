// Stylemax-native generation taxonomy.
// ─────────────────────────────────────────────────────────────────────────────
// SOURCE OF TRUTH: these constants MIRROR src/data/demoItems.ts and src/data/moods.ts.
// Node can't import the .ts files without a loader, and the eval harness is
// likewise self-contained .mjs, so we mirror here and keep in sync by hand.
// If you change colorHexMap / seasonMap / userMoodsMap or the mood list in src/,
// update this file too.
//
// Every value below is chosen so generated labels land IN-VOCABULARY for:
//   - IntakeAgent.ts        (the 4 categories, 4 seasons, 5 moods)
//   - scripts/eval/score.mjs (expectedCategory / expectedColorHex / expectedMoods / expectedSeasons)

/** The only categories the app supports. No shoes, no accessories. */
export const CATEGORIES = ["tops", "bottoms", "outerwear", "dresses"];

export const VALID_SEASONS = ["spring", "summer", "fall", "winter"];
export const VALID_MOODS = ["professional", "casual", "sporty", "creative", "romantic"];

// Mirror of src/data/demoItems.ts colorHexMap (gray/grey dedup'd to one generation name).
export const COLOR_HEX = {
    white: "#FFFFFF",
    black: "#000000",
    grey: "#9ca3af",
    blue: "#3b82f6",
    navy: "#1e3a8a",
    red: "#ef4444",
    green: "#22c55e",
    brown: "#78350f",
    beige: "#d2b48c",
    cream: "#fef3c7",
    pink: "#ec4899",
    orange: "#f97316",
    yellow: "#eab308",
    purple: "#a855f7",
    olive: "#6b7f5e",
};

// Default generation palette — a readable spread of the map above. Light colors
// (white/cream) get a grey backdrop in prompt.mjs so the item doesn't vanish.
export const PALETTE = [
    "white", "black", "navy", "beige", "olive",
    "grey", "blue", "brown", "cream", "pink",
];

// Mirror of src/data/demoItems.ts seasonMap — per-category seasons, used as the
// label default when a subcategory doesn't override.
export const SEASON_BY_CATEGORY = {
    tops: ["spring", "summer", "fall"],
    bottoms: ["spring", "fall", "winter"],
    outerwear: ["fall", "winter"],
    dresses: ["spring", "summer"],
};

// Mirror of src/data/demoItems.ts userMoodsMap — per-category moods, used as the
// label default when a subcategory doesn't override.
export const MOODS_BY_CATEGORY = {
    tops: ["casual", "professional"],
    bottoms: ["casual", "sporty"],
    outerwear: ["professional", "casual"],
    dresses: ["romantic", "creative"],
};

// Subcategories per category. Each carries:
//   slug        — filename-safe id
//   phrase      — what goes into the generation prompt
//   keywords    — substrings the eval scorer looks for in the model's `subcategory`
//   moods       — optional override of MOODS_BY_CATEGORY (more accurate per garment)
//   seasons     — optional override of SEASON_BY_CATEGORY
// Material (denim / wool / silk …) is folded into the phrase per the plan.
// All solids — no patterns — so expectedColorHex stays unambiguous for scoring.
export const SUBCATEGORIES = {
    tops: [
        { slug: "crew-tee", phrase: "crew-neck t-shirt", keywords: ["tee", "t-shirt", "crew"], moods: ["casual", "sporty"], seasons: ["spring", "summer"] },
        { slug: "button-down", phrase: "button-down oxford shirt", keywords: ["button-down", "button down", "shirt", "oxford"], moods: ["professional", "casual"], seasons: ["spring", "summer", "fall"] },
        { slug: "hoodie", phrase: "oversized hoodie", keywords: ["hoodie", "sweatshirt"], moods: ["sporty", "casual"], seasons: ["fall", "winter"] },
        { slug: "knit-sweater", phrase: "knit sweater", keywords: ["sweater", "knit", "pullover", "jumper"], moods: ["casual", "creative"], seasons: ["fall", "winter"] },
        { slug: "silk-blouse", phrase: "silk blouse", keywords: ["blouse", "silk"], moods: ["romantic", "professional"], seasons: ["spring", "summer", "fall"] },
    ],
    bottoms: [
        { slug: "slim-jeans", phrase: "slim-fit jeans", keywords: ["jeans", "denim"], moods: ["casual", "sporty"], seasons: ["spring", "fall", "winter"] },
        { slug: "chinos", phrase: "tailored chinos", keywords: ["chino", "chinos", "trouser"], moods: ["professional", "casual"], seasons: ["spring", "fall"] },
        { slug: "trousers", phrase: "tailored wool trousers", keywords: ["trouser", "trousers", "slacks", "pants"], moods: ["professional", "creative"], seasons: ["fall", "winter"] },
        { slug: "pleated-skirt", phrase: "pleated midi skirt", keywords: ["skirt", "pleated", "midi"], moods: ["romantic", "creative"], seasons: ["spring", "summer"] },
        { slug: "denim-shorts", phrase: "denim shorts", keywords: ["shorts", "denim"], moods: ["casual", "sporty"], seasons: ["summer"] },
    ],
    outerwear: [
        { slug: "denim-jacket", phrase: "denim jacket", keywords: ["denim jacket", "jacket", "trucker"], moods: ["casual", "creative"], seasons: ["spring", "fall"] },
        { slug: "wool-coat", phrase: "wool overcoat", keywords: ["coat", "overcoat", "wool"], moods: ["professional", "romantic"], seasons: ["fall", "winter"] },
        { slug: "blazer", phrase: "tailored blazer", keywords: ["blazer", "jacket", "suit"], moods: ["professional", "creative"], seasons: ["spring", "fall", "winter"] },
        { slug: "puffer-parka", phrase: "puffer parka", keywords: ["parka", "puffer", "down jacket"], moods: ["sporty", "casual"], seasons: ["winter"] },
        { slug: "cardigan", phrase: "knit cardigan", keywords: ["cardigan", "knit"], moods: ["casual", "romantic"], seasons: ["fall", "winter"] },
    ],
    dresses: [
        { slug: "wrap-dress", phrase: "wrap dress", keywords: ["wrap dress", "wrap", "dress"], moods: ["romantic", "professional"], seasons: ["spring", "summer"] },
        { slug: "slip-dress", phrase: "slip dress", keywords: ["slip dress", "slip", "dress"], moods: ["romantic", "creative"], seasons: ["summer"] },
        { slug: "shirt-dress", phrase: "shirt dress", keywords: ["shirt dress", "shirtdress", "dress"], moods: ["casual", "professional"], seasons: ["spring", "summer", "fall"] },
        { slug: "sundress", phrase: "summer sundress", keywords: ["sundress", "dress", "summer"], moods: ["romantic", "casual"], seasons: ["summer"] },
    ],
};

/** Hex lookup with a safe fallback matching demoItems.ts behavior (#9ca3af). */
export function hexForColor(color) {
    return COLOR_HEX[String(color).toLowerCase()] || "#9ca3af";
}

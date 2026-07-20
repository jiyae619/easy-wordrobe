// Build the combo matrix: category × subcategory × color, with deterministic
// seeds so the SAME combo renders comparably across engines (critical for the
// bake-off) and reruns are reproducible. No Math.random — order and seeds come
// from a stable string hash.

import { CATEGORIES, SUBCATEGORIES, PALETTE } from "./taxonomy.mjs";

// djb2 — small, stable, dependency-free.
function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h;
}

/** Stable seed in [1000, 1000+99999] from a combo key + variant index. */
export function seedFor(comboKey, variant = 0) {
    return 1000 + (hash(`${comboKey}#${variant}`) % 100000);
}

function comboKey(category, sub, color) {
    return `${category}-${sub.slug}-${color}`;
}

function makeCombo(category, sub, color, variant = 0) {
    const key = comboKey(category, sub, color);
    return {
        comboKey: key,
        category,
        subSlug: sub.slug,
        phrase: sub.phrase,
        keywords: sub.keywords,
        moods: sub.moods, // may be undefined -> prompt.mjs falls back to category default
        seasons: sub.seasons,
        color,
        variant,
        seed: seedFor(key, variant),
    };
}

/** The full category × subcategory × color grid (one variant each). */
export function fullGrid(palette = PALETTE) {
    const combos = [];
    for (const category of CATEGORIES) {
        for (const sub of SUBCATEGORIES[category]) {
            for (const color of palette) {
                combos.push(makeCombo(category, sub, color));
            }
        }
    }
    return combos;
}

/**
 * Balanced sample of `count` combos. Deterministic: sort the full grid by a
 * hash of its key (stable shuffle), then take the first `count`. If count
 * exceeds the grid, wrap around adding seed variants so we never duplicate a
 * (combo, seed) pair.
 */
export function sampleMatrix({ count = 200, palette = PALETTE } = {}) {
    const grid = fullGrid(palette);
    const shuffled = [...grid].sort((a, b) => hash(a.comboKey) - hash(b.comboKey));
    if (count <= shuffled.length) return shuffled.slice(0, count);

    const out = [...shuffled];
    let variant = 1;
    while (out.length < count) {
        for (const base of shuffled) {
            if (out.length >= count) break;
            const sub = SUBCATEGORIES[base.category].find((s) => s.slug === base.subSlug);
            out.push(makeCombo(base.category, sub, base.color, variant));
        }
        variant++;
    }
    return out;
}

/**
 * Small category-balanced set: one combo per category first (first subcategory,
 * distinct palette colors), then any extras filled round-robin across categories,
 * advancing the subcategory each lap so (category, subcategory) pairs stay distinct
 * until the grid forces a repeat. Deterministic. Use for smoke tests that must still
 * touch every category — e.g. `total: 5` → one of each + a second top.
 */
export function perCategoryMatrix({ total = CATEGORIES.length, palette = PALETTE } = {}) {
    const out = [];
    CATEGORIES.forEach((category, i) => {
        const sub = SUBCATEGORIES[category][0];
        out.push(makeCombo(category, sub, palette[i % palette.length]));
    });
    for (let i = 0; out.length < total; i++) {
        const category = CATEGORIES[i % CATEGORIES.length];
        const subs = SUBCATEGORIES[category];
        const sub = subs[(1 + Math.floor(i / CATEGORIES.length)) % subs.length];
        out.push(makeCombo(category, sub, palette[out.length % palette.length]));
    }
    return out;
}

/**
 * The 12-image bake-off set: first 3 subcategories of each of the 4 categories,
 * each paired with a distinct palette color, fixed seeds. Same set regardless of
 * engine so review.html can line them up side by side.
 */
export function bakeoffMatrix() {
    const combos = [];
    let i = 0;
    for (const category of CATEGORIES) {
        for (const sub of SUBCATEGORIES[category].slice(0, 3)) {
            const color = PALETTE[i % PALETTE.length];
            combos.push(makeCombo(category, sub, color));
            i++;
        }
    }
    return combos;
}

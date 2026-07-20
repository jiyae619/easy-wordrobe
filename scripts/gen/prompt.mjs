// Combo → (a) the generation prompt and (b) the eval-format label sidecar.
// Adapted from the guide §5.3 template, Stylemax-tuned: fixed presentation
// (front view, on hanger), no model/mannequin, solid colors only.

import { hexForColor, MOODS_BY_CATEGORY, SEASON_BY_CATEGORY } from "./taxonomy.mjs";

// White/cream garments disappear on a white backdrop — give them grey instead.
function backdropFor(color) {
    const c = String(color).toLowerCase();
    return c === "white" || c === "cream"
        ? "light grey studio background"
        : "clean white background";
}

/**
 * Build the text-to-image prompt.
 * @param {object} combo  from matrix.mjs
 * @param {object} [opts] { noisy } — noisy swaps the clean studio for a cluttered
 *                        room to exercise IntakeAgent's hasNoisyBackground path.
 */
export function buildPrompt(combo, { noisy = false } = {}) {
    const scene = noisy
        ? "laid on an unmade bed in a cluttered bedroom, natural window light"
        : `${backdropFor(combo.color)}, soft even studio lighting`;
    return [
        // No indefinite article — avoids "a jeans" / "a olive" and reads like a caption.
        `${combo.color} ${combo.phrase}`,
        "front view, on a wooden hanger",
        scene,
        "fashion e-commerce catalog photography",
        "no model, no mannequin, no person, no hands",
        "no text, no logo, no watermark",
        "high detail fabric texture, sharp focus",
    ].join(", ");
}

/**
 * Build the ground-truth sidecar in the exact shape scripts/eval/score.mjs reads
 * (see scripts/eval/fixtures/README.md). Moods/seasons fall back to the
 * category defaults that the app itself uses (demoItems.ts) when a subcategory
 * doesn't override them.
 */
export function buildLabel(combo, { noisy = false } = {}) {
    return {
        expectedCategory: combo.category,
        expectedColorHex: hexForColor(combo.color),
        subcategoryKeywords: combo.keywords,
        expectedMoods: combo.moods ?? MOODS_BY_CATEGORY[combo.category],
        expectedSeasons: combo.seasons ?? SEASON_BY_CATEGORY[combo.category],
        notes:
            `${combo.color} ${combo.phrase}` +
            (noisy ? ", cluttered background" : ", front view on hanger, studio bg") +
            `, seed ${combo.seed}` +
            (combo.variant ? ` (v${combo.variant})` : ""),
    };
}

/** Filename stem shared by the .png and .json — safe across all combos. */
export function stemFor(combo) {
    const v = combo.variant ? `-v${combo.variant}` : "";
    return `${combo.category}-${combo.subSlug}-${combo.color}${v}-s${combo.seed}`;
}

/**
 * Keyword matching for the style rules (data/moodStyles, data/weatherStyles): rule terms are matched
 * as whole words against a piece's name and free-form tags, with an optional plural "s"/"es".
 */

/** Lowercase, hyphens to spaces, every spelling of t-shirt to "tshirt" (so "shirt" won't match it). */
export function normalizeText(text: string): string {
    return ` ${text.toLowerCase().replace(/[-_/]+/g, ' ').replace(/\bt\s?shirts?\b/g, 'tshirt').replace(/\s+/g, ' ').trim()} `;
}

const patternCache = new Map<string, RegExp>();
function termPattern(term: string): RegExp {
    let pattern = patternCache.get(term);
    if (!pattern) {
        const escaped = normalizeText(term).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        pattern = new RegExp(`\\b${escaped}(?:s|es)?\\b`);
        patternCache.set(term, pattern);
    }
    return pattern;
}

export function matchesAny(text: string, terms: string[]): boolean {
    return terms.some((term) => termPattern(term).test(text));
}

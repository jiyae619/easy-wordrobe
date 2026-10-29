import { ClothingCategory } from '../types';

/**
 * What each mood means in actual garments. A curated rules table built from long-standing dress
 * conventions (business / business-casual dress codes, smart-casual, athleisure, and occasion /
 * cocktail dress codes) rather than from live
 * trend data: it is free, instant, deterministic and testable, so it can sit on Today's hot path.
 *
 * Sources: business-casual dress-code guides (what to wear and avoid at work), romantic-style guides
 * (soft, flowing fabrics, florals and ruffles, delicate shoes), which with occasion and cocktail
 * dress codes shape the gender-neutral Special day, and athleisure guides (joggers, leggings,
 * hoodies, technical and stretch fabrics, sneakers), which now fold into Casual.
 *
 * It is used twice:
 *  - the prose fields brief the StylistAgent (the prompt used to get only the mood's name);
 *  - the keyword lists drive the code-side mood-fit score (services/agents/moodFit.ts), which
 *    filters off-mood pieces out of the prompt and ranks the code-assembled looks.
 *
 * Keywords are matched as whole words against an item's subcategory (e.g. "Slim-Fit Chinos"), with
 * an optional plural "s"/"es". Keep them lowercase.
 */
export interface MoodStyle {
    /** One-line definition of the mood for the prompt. */
    brief: string;
    /** Garments that read as this mood. */
    reachFor: string;
    /** Silhouettes, fabrics and formality. */
    shape: string;
    /** Color guidance. */
    colors: string;
    /** What breaks the mood. */
    avoid: string;
    keywords: {
        /** Textbook pieces for the mood. */
        strong: string[];
        /** Pieces that work in the mood. */
        good: string[];
        /** Pieces that clash with the mood. */
        avoid: string[];
    };
    /** Palette color names (data/colorPalette) that suit / fight the mood. */
    colorAffinity: { good: string[]; avoid: string[] };
    /** Small per-category nudge for a mood (e.g. -0.2 for dresses). */
    categoryBias?: Partial<Record<ClothingCategory, number>>;
}

export const MOOD_STYLES: Record<string, MoodStyle> = {
    professional: {
        brief: 'Polished and office ready: business casual or sharper. Structured, tailored, understated.',
        reachFor: 'blazers, button-down or oxford shirts, blouses, fine knits, turtlenecks; tailored trousers, chinos, pencil or midi skirts; sheath, shirt or wrap dresses; loafers, oxfords, pumps, ankle boots; a wool coat or trench',
        shape: 'clean lines, structured shoulders, pressed fabrics (wool, cotton poplin, silk, fine knit), knee length or longer',
        colors: 'navy, black, grey, white, cream, beige, camel and brown, with at most one muted accent',
        avoid: 'hoodies and sweatshirts, athletic wear, t-shirts and graphic tees, crop or tank tops, shorts, jeans, sneakers, sandals and flip flops, hiking boots, slip dresses and sundresses',
        keywords: {
            strong: ['blazer', 'suit', 'sport coat', 'trouser', 'dress pant', 'khaki', 'tailored', 'slack', 'pencil', 'button-down', 'button-up', 'oxford', 'dress shirt', 'blouse', 'turtleneck', 'sheath', 'shirt dress', 'loafer', 'pump', 'derby', 'brogue', 'trench', 'wool coat', 'vest', 'waistcoat'],
            good: ['shirt', 'chino', 'cardigan', 'sweater', 'knit', 'pullover', 'midi', 'wrap dress', 'wrap', 'pleated skirt', 'skirt', 'ankle boot', 'mule', 'coat', 'polo', 'heel', 'flat'],
            avoid: ['hoodie', 'sweatshirt', 'jogger', 'legging', 'sweatpant', 'track', 'tracksuit', 'athletic', 'running', 'gym', 'graphic', 'tshirt', 'tee', 'crop', 'tank', 'cami', 'shorts', 'jean', 'ripped', 'distressed', 'cargo', 'flip-flop', 'slide', 'sandal', 'hiking', 'sneaker', 'trainer', 'slip dress', 'sundress', 'mini', 'denim jacket', 'puffer', 'windbreaker', 'fleece'],
        },
        colorAffinity: { good: ['Black', 'Navy', 'Grey', 'White', 'Cream', 'Beige', 'Brown'], avoid: ['Yellow', 'Orange'] },
    },
    casual: {
        brief: 'Relaxed, comfortable, everyday, athleisure included: easy pieces that still look put together.',
        reachFor: 't-shirts, sweatshirts and hoodies, knit sweaters, casual shirts, polos, cardigans, denim, utility or track jackets; jeans, chinos, joggers, leggings, shorts, casual skirts; sundresses and t-shirt dresses; sneakers, boots, sandals',
        shape: 'relaxed fits, soft cotton, denim and knits; mix one sharper piece with easy basics',
        colors: 'anything goes; denim blue, neutrals and one easy color work best',
        avoid: 'full suiting, evening or cocktail pieces (sequins, satin gowns), stilettos, head to toe gym kit',
        keywords: {
            strong: ['tshirt', 'tee', 'jean', 'denim', 'chino', 'sweatshirt', 'hoodie', 'sneaker', 'cardigan', 'flannel', 'polo', 'sundress', 'tshirt dress', 'henley', 'overshirt', 'jumper'],
            good: ['sweater', 'knit', 'pullover', 'shirt', 'shorts', 'skirt', 'denim jacket', 'jacket', 'boot', 'sandal', 'loafer', 'puffer', 'parka', 'cargo', 'wrap dress', 'linen', 'jogger', 'legging', 'sweatpant', 'track jacket', 'zip-up', 'quarter-zip', 'fleece', 'windbreaker', 'anorak'],
            avoid: ['tuxedo', 'gown', 'cocktail', 'sequin', 'suit', 'stiletto', 'pump', 'waistcoat'],
        },
        colorAffinity: { good: ['Blue', 'Navy', 'White', 'Grey', 'Olive', 'Beige', 'Cream'], avoid: [] },
    },
    occasion: {
        brief: 'Dressed up for a celebration, dinner, date or event: a clear step above everyday, polished with one special touch. For everyone.',
        reachFor: 'dresses (wrap, slip, midi, shirt or cocktail) and dressy skirts; silk or satin shirts and blouses, crisp button-downs, fine knits and turtlenecks; tailored trousers or dark, clean jeans; blazers, suit jackets, a wool coat or trench; loafers, dress shoes, heels, sleek boots',
        shape: 'tailored or fluid lines, nothing baggy or worn in; richer fabrics (silk, satin, velvet, fine wool, cashmere); one statement piece, print or detail',
        colors: 'black, navy, cream and white, deep jewel tones (burgundy, emerald, plum); one bold color or print as the statement',
        avoid: 'hoodies and sweatshirts, athletic wear, t-shirts and graphic tees, shorts, cargo and utility pieces, ripped or distressed denim, puffers, fleece and windbreakers, sneakers and trainers, flip flops',
        keywords: {
            strong: ['silk', 'satin', 'velvet', 'lace', 'sequin', 'cocktail', 'gown', 'tuxedo', 'suit', 'blazer', 'dress shirt', 'button-down', 'button-up', 'blouse', 'turtleneck', 'cashmere', 'tailored', 'trouser', 'slip dress', 'wrap dress', 'sheath', 'jumpsuit', 'midi', 'maxi', 'pleated', 'heel', 'pump', 'loafer', 'oxford', 'derby', 'brogue', 'dress shoe', 'chelsea', 'mary jane'],
            good: ['dress', 'skirt', 'shirt', 'knit', 'sweater', 'cardigan', 'vest', 'waistcoat', 'wool coat', 'trench', 'coat', 'chino', 'ankle boot', 'boot', 'mule', 'flat', 'ballet', 'sandal', 'sundress', 'jean'],
            avoid: ['hoodie', 'sweatshirt', 'jogger', 'legging', 'sweatpant', 'track', 'tracksuit', 'athletic', 'running', 'gym', 'graphic', 'tshirt', 'tee', 'shorts', 'cargo', 'utility', 'ripped', 'distressed', 'puffer', 'fleece', 'windbreaker', 'anorak', 'sneaker', 'trainer', 'flip-flop', 'slide', 'denim jacket'],
        },
        colorAffinity: { good: ['Black', 'Navy', 'Cream', 'White', 'Red', 'Purple', 'Green'], avoid: ['Orange', 'Yellow'] },
    },
};

export function getMoodStyle(moodId: string): MoodStyle | undefined {
    return MOOD_STYLES[moodId];
}

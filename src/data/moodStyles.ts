import { ClothingCategory } from '../types';

/**
 * What each mood means in actual garments. A curated rules table built from long-standing dress
 * conventions (business / business-casual dress codes, smart-casual, athleisure, and the
 * "romantic" style vocabulary of soft fabrics and feminine silhouettes) rather than from live
 * trend data: it is free, instant, deterministic and testable, so it can sit on Today's hot path.
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
    /** Small per-category nudge, e.g. dresses are rarely sporty. */
    categoryBias?: Partial<Record<ClothingCategory, number>>;
}

export const MOOD_STYLES: Record<string, MoodStyle> = {
    professional: {
        brief: 'Polished and office ready: business casual or sharper. Structured, tailored, understated.',
        reachFor: 'blazers, button-down or oxford shirts, blouses, fine knits, turtlenecks; tailored trousers, chinos, pencil or midi skirts; sheath, shirt or wrap dresses; loafers, oxfords, pumps, ankle boots; a wool coat or trench',
        shape: 'clean lines, structured shoulders, pressed fabrics (wool, cotton poplin, silk, fine knit), knee length or longer',
        colors: 'navy, black, grey, white, cream, beige, camel and brown, with at most one muted accent',
        avoid: 'hoodies and sweatshirts, athletic wear, graphic tees, crop or tank tops, shorts, ripped or distressed denim, sporty sneakers, flip flops, slip dresses and sundresses',
        keywords: {
            strong: ['blazer', 'suit', 'trouser', 'tailored', 'slack', 'pencil', 'button-down', 'button-up', 'oxford', 'dress shirt', 'blouse', 'turtleneck', 'sheath', 'shirt dress', 'loafer', 'pump', 'derby', 'brogue', 'trench', 'wool coat', 'vest', 'waistcoat'],
            good: ['shirt', 'chino', 'cardigan', 'sweater', 'knit', 'pullover', 'midi', 'wrap dress', 'wrap', 'pleated skirt', 'skirt', 'ankle boot', 'mule', 'coat', 'polo', 'heel', 'flat'],
            avoid: ['hoodie', 'sweatshirt', 'jogger', 'legging', 'sweatpant', 'track', 'tracksuit', 'athletic', 'running', 'gym', 'graphic', 'crop', 'tank', 'cami', 'shorts', 'ripped', 'distressed', 'cargo', 'flip-flop', 'slide', 'sneaker', 'trainer', 'slip dress', 'sundress', 'mini', 'denim jacket', 'puffer', 'windbreaker', 'fleece'],
        },
        colorAffinity: { good: ['Black', 'Navy', 'Grey', 'White', 'Cream', 'Beige', 'Brown'], avoid: ['Yellow', 'Orange'] },
    },
    casual: {
        brief: 'Relaxed, comfortable, everyday: easy pieces that still look put together.',
        reachFor: 't-shirts, sweatshirts, knit sweaters, casual shirts, polos, cardigans, denim or utility jackets; jeans, chinos, shorts, casual skirts; sundresses and t-shirt dresses; sneakers, boots, sandals',
        shape: 'relaxed fits, soft cotton, denim and knits; mix one sharper piece with easy basics',
        colors: 'anything goes; denim blue, neutrals and one easy color work best',
        avoid: 'full suiting, evening or cocktail pieces (sequins, satin gowns), stilettos, head to toe gym kit',
        keywords: {
            strong: ['tshirt', 'tee', 'jean', 'denim', 'chino', 'sweatshirt', 'hoodie', 'sneaker', 'cardigan', 'flannel', 'polo', 'sundress', 'tshirt dress', 'henley', 'overshirt', 'jumper'],
            good: ['sweater', 'knit', 'pullover', 'shirt', 'shorts', 'skirt', 'denim jacket', 'jacket', 'boot', 'sandal', 'loafer', 'puffer', 'parka', 'cargo', 'wrap dress', 'linen'],
            avoid: ['tuxedo', 'gown', 'cocktail', 'sequin', 'suit', 'stiletto', 'pump', 'waistcoat'],
        },
        colorAffinity: { good: ['Blue', 'Navy', 'White', 'Grey', 'Olive', 'Beige', 'Cream'], avoid: [] },
    },
    sporty: {
        brief: 'Active, energetic athleisure: built to move, technical or jersey fabrics, trainers.',
        reachFor: 'hoodies, sweatshirts, performance or jersey tees, tanks, track, zip or windbreaker jackets, fleece, puffers; joggers, leggings, track pants, sweatpants, athletic or bike shorts; sneakers and running shoes',
        shape: 'stretch and jersey, relaxed or fitted athletic cuts, layers you can unzip',
        colors: 'black, grey, white and navy with a bright or color block accent',
        avoid: 'tailoring (blazers, trousers, pencil skirts), silk, satin and lace, blouses, heels, loafers and dress shoes, formal dresses and wool coats',
        keywords: {
            strong: ['hoodie', 'sweatshirt', 'jogger', 'legging', 'track', 'tracksuit', 'sweatpant', 'athletic', 'running', 'sneaker', 'trainer', 'windbreaker', 'sports bra', 'bike short', 'performance', 'gym', 'tennis', 'zip-up', 'quarter-zip', 'fleece', 'anorak'],
            good: ['tee', 'tshirt', 'tank', 'shorts', 'puffer', 'parka', 'polo', 'sweater', 'pullover', 'jacket', 'cap', 'denim shorts'],
            avoid: ['blazer', 'suit', 'trouser', 'tailored', 'slack', 'pencil', 'silk', 'satin', 'lace', 'blouse', 'heel', 'pump', 'stiletto', 'loafer', 'oxford', 'derby', 'brogue', 'dress shoe', 'gown', 'cocktail', 'wool coat', 'trench', 'slip dress', 'wrap dress', 'sheath', 'button-down', 'button-up', 'pleated', 'midi', 'maxi', 'chiffon', 'ruffle'],
        },
        colorAffinity: { good: ['Black', 'Grey', 'White', 'Navy', 'Red', 'Blue', 'Teal', 'Green', 'Orange', 'Yellow'], avoid: ['Brown', 'Beige'] },
        categoryBias: { [ClothingCategory.Dresses]: -0.2 },
    },
    romantic: {
        brief: 'Soft, feminine and a little dressy: date night or a lovely day out. Flowing shapes, delicate fabrics.',
        reachFor: 'blouses (silk, lace, ruffles, puff sleeves), camisoles, soft knits and cardigans; pleated, midi, A-line or slip skirts, flowing trousers; wrap, slip, midi or floral dresses and sundresses; ballet flats, Mary Janes, heels, strappy sandals, sleek ankle boots',
        shape: 'fluid drape, waist definition, midi and maxi lengths; silk, satin, lace, chiffon, cashmere',
        colors: 'blush and pink, cream, ivory, white, lavender, burgundy and red, soft neutrals; black for evening',
        avoid: 'hoodies and sweatshirts, athletic wear, cargo and utility pieces, puffers, parkas and windbreakers, graphic tees, chunky trainers',
        keywords: {
            strong: ['blouse', 'silk', 'satin', 'lace', 'chiffon', 'ruffle', 'puff sleeve', 'wrap dress', 'slip dress', 'slip skirt', 'sundress', 'midi', 'maxi', 'floral', 'pleated', 'a-line', 'tulle', 'off-shoulder', 'camisole', 'cami', 'mary jane', 'ballet', 'heel', 'kitten heel', 'bow', 'corset', 'peplum'],
            good: ['skirt', 'dress', 'cardigan', 'cashmere', 'mohair', 'knit', 'sweater', 'wrap', 'sandal', 'ankle boot', 'flat', 'trench', 'wool coat', 'coat', 'shirt'],
            avoid: ['hoodie', 'sweatshirt', 'jogger', 'legging', 'sweatpant', 'track', 'tracksuit', 'athletic', 'running', 'gym', 'cargo', 'puffer', 'parka', 'windbreaker', 'fleece', 'graphic', 'utility', 'combat', 'chunky', 'trainer', 'anorak'],
        },
        colorAffinity: { good: ['Pink', 'Cream', 'White', 'Red', 'Purple', 'Beige'], avoid: ['Olive', 'Orange'] },
    },
};

export function getMoodStyle(moodId: string): MoodStyle | undefined {
    return MOOD_STYLES[moodId];
}

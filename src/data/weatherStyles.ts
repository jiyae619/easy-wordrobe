/**
 * What today's weather asks of an outfit, as a curated rules table (the weather twin of
 * data/moodStyles). Sources it was built from:
 *  - Rain: wet-weather dressing guides agree on skipping suede, canvas and delicate fabrics, keeping
 *    cotton and denim off the outer layer, and reaching for a waterproof or water-resistant shell
 *    (trench, rain jacket, nylon) and boots with grippy soles. Leather is excluded on the product
 *    owner's call (untreated leather marks). Knits soak up water, so they are allowed only as a
 *    warm layer under a raincoat, the way the same guides recommend them.
 *  - Temperature: the bands match computeWeatherMatch's seasons (<=5 / <=15 / <=24 / >24 °C), scored
 *    on "feels like", with the garments in each band ordered by warmth the way clothing-insulation
 *    (clo) tables rank them: coats and knits high, tees, linen and sandals low.
 *
 * Keywords are matched as whole words against a piece's name and free-form tags (services/agents/
 * styleText), so "Leather Biker Jacket" and "Wool Knit Sweater" are caught by "leather" and "knit".
 */

export type TemperatureBand = 'cold' | 'cool' | 'mild' | 'hot';

/** What the weather is doing, reduced to what changes an outfit. */
export interface WeatherConditions {
    band: TemperatureBand;
    /** Rain, showers, drizzle, storms, or anything frozen falling. */
    wet: boolean;
    /** Snow, sleet, ice. Implies wet. */
    snow: boolean;
    /** Wind at or above WINDY_KMH. */
    windy: boolean;
    /** The temperature the band was read from ("feels like" when known), °C. */
    feelsLikeC: number;
}

export const WINDY_KMH = 30;

export interface WeatherRule {
    /** Short name shown in the prompt and on the style rules page. */
    label: string;
    /** One line for the Stylist prompt. */
    brief: string;
    keywords: {
        /** Made for this weather. */
        strong: string[];
        /** Works in this weather. */
        good: string[];
        /** Mildly wrong for it: scored down, still allowed. */
        poor: string[];
        /** Breaks the weather: never sent to the Stylist (unless the closet has nothing else). */
        avoid: string[];
        /**
         * Fine only under a weatherproof layer (knits in the rain): allowed when a raincoat or
         * other shell is available to wear over them, treated as "avoid" when there is none.
         */
        underShellOnly?: string[];
    };
}

export const BAND_RULES: Record<TemperatureBand, WeatherRule> = {
    cold: {
        label: 'Cold (feels 5 °C or below)',
        brief: 'Dress warm: a coat on every outfit, long sleeves and full-length bottoms, closed shoes or boots.',
        keywords: {
            strong: ['coat', 'wool coat', 'puffer', 'parka', 'down jacket', 'down coat', 'fleece', 'thermal', 'turtleneck', 'sweater', 'knit', 'cashmere', 'boot'],
            good: ['cardigan', 'jacket', 'trench', 'hoodie', 'sweatshirt', 'jean', 'trouser', 'legging', 'corduroy', 'flannel'],
            poor: ['tshirt dress', 'mini', 'ballet', 'mesh', 'sneaker'],
            avoid: ['shorts', 'bike short', 'sandal', 'flip flop', 'slide', 'espadrille', 'tank', 'cami', 'camisole', 'crop', 'linen', 'sundress', 'slip dress'],
        },
    },
    cool: {
        label: 'Cool (feels 6 to 15 °C)',
        brief: 'Layer up: a jacket or coat over long sleeves, closed shoes.',
        keywords: {
            strong: ['jacket', 'trench', 'coat', 'cardigan', 'sweater', 'knit', 'boot'],
            good: ['jean', 'trouser', 'chino', 'sweatshirt', 'hoodie', 'fleece', 'blazer', 'shirt', 'flannel', 'loafer'],
            poor: ['shorts', 'sandal', 'tank', 'cami', 'crop', 'linen', 'sundress', 'espadrille'],
            avoid: ['flip flop', 'slide'],
        },
    },
    mild: {
        label: 'Mild (feels 16 to 24 °C)',
        brief: 'Light layers: a tee, shirt or light knit, with a light jacket at most. No heavy coats.',
        keywords: {
            strong: ['tshirt', 'tee', 'shirt', 'blouse', 'denim jacket', 'trench', 'cardigan'],
            good: ['jean', 'chino', 'skirt', 'dress', 'sneaker', 'loafer', 'polo', 'light jacket'],
            poor: ['puffer', 'parka', 'down jacket', 'down coat', 'wool coat', 'fleece', 'thermal', 'snow boot', 'turtleneck'],
            avoid: [],
        },
    },
    hot: {
        label: 'Hot (feels 25 °C or above)',
        brief: 'Keep it breathable: short sleeves, linen and cotton, shorts, skirts or light dresses, open or light shoes. No coats, knits or boots.',
        keywords: {
            strong: ['linen', 'shorts', 'sundress', 'tank', 'cami', 'sandal', 'espadrille', 'short sleeve'],
            good: ['tshirt', 'tee', 'skirt', 'slip dress', 'polo', 'sneaker', 'shirt', 'blouse'],
            poor: ['sweater', 'knit', 'cardigan', 'cashmere', 'boot', 'leather jacket', 'jean', 'legging', 'blazer', 'hoodie', 'sweatshirt', 'jacket', 'coat', 'trench'],
            avoid: ['puffer', 'parka', 'down jacket', 'down coat', 'wool coat', 'fleece', 'thermal', 'snow boot', 'turtleneck'],
        },
    },
};

export const CONDITION_RULES: Record<'wet' | 'snow' | 'windy', WeatherRule> = {
    wet: {
        label: 'Rain',
        brief: 'Rain: a waterproof or wind-proof outer layer (raincoat, trench, shell) on every outfit and boots on your feet. Knits only under the raincoat. No leather, suede, canvas or open shoes.',
        keywords: {
            strong: ['raincoat', 'rain jacket', 'rain coat', 'mac', 'mackintosh', 'trench', 'waterproof', 'water resistant', 'shell', 'anorak', 'parka', 'windbreaker', 'gore tex', 'rain boot', 'wellington', 'welly', 'gumboot', 'rubber'],
            good: ['boot', 'nylon', 'puffer', 'polyester'],
            poor: ['denim jacket', 'sneaker', 'linen', 'chiffon', 'mule', 'loafer', 'heel'],
            avoid: ['leather', 'suede', 'nubuck', 'canvas', 'espadrille', 'sandal', 'flip flop', 'slide', 'ballet', 'silk', 'satin'],
            underShellOnly: ['knit', 'knitted', 'knitwear', 'sweater', 'cardigan', 'jumper', 'cashmere', 'mohair'],
        },
    },
    snow: {
        label: 'Snow or ice',
        brief: 'Snow: warm boots with grip, a warm waterproof coat. No open, smooth-soled or delicate shoes.',
        keywords: {
            strong: ['boot', 'snow boot', 'parka', 'puffer', 'down jacket', 'down coat', 'wool coat', 'thermal'],
            good: ['coat', 'fleece', 'waterproof'],
            poor: ['sneaker', 'loafer'],
            avoid: ['sandal', 'flip flop', 'slide', 'espadrille', 'ballet', 'heel', 'pump', 'stiletto', 'mule', 'canvas', 'suede'],
        },
    },
    windy: {
        label: 'Windy',
        brief: 'Wind: a wind-proof outer layer that closes (windbreaker, shell, trench, parka). Skip floaty skirts and sheer fabrics.',
        keywords: {
            strong: ['windbreaker', 'shell', 'anorak', 'parka', 'trench', 'raincoat', 'rain jacket'],
            good: ['jacket', 'coat', 'puffer'],
            poor: ['chiffon', 'tulle', 'slip skirt', 'maxi skirt', 'sheer'],
            avoid: [],
        },
    },
};

/** Outer layers that keep rain and wind out: the wet rule's "strong" outerwear terms. */
export const WEATHERPROOF_OUTER_TERMS = ['raincoat', 'rain jacket', 'rain coat', 'mac', 'mackintosh', 'trench', 'waterproof', 'water resistant', 'shell', 'anorak', 'parka', 'windbreaker', 'gore tex'];
export const BOOT_TERMS = ['boot', 'rain boot', 'snow boot', 'wellington', 'welly', 'gumboot'];

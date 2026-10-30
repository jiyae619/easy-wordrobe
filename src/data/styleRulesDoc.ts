import { ClothingCategory, type ClothingItem } from '../types';
import { MOODS } from './moods';
import { MOOD_STYLES } from './moodStyles';
import { BAND_RULES, CONDITION_RULES, WINDY_KMH, type WeatherRule } from './weatherStyles';
import { HIGH_FIT_THRESHOLD, OFF_MOOD_THRESHOLD, itemMoodFit } from '../services/agents/moodFit';
import { OFF_WEATHER_THRESHOLD, itemWeatherFit, readWeather } from '../services/agents/weatherFit';

/**
 * Renders docs/STYLE_RULES.md from the live rule tables and scoring code, so the doc can't drift:
 * src/data/__tests__/styleRulesDoc.test.ts fails when the file differs from this output.
 * Regenerate with `npm run docs:style-rules`. Not imported by the app.
 */

const SOURCES: Array<{ title: string; what: string; used: string; links: Array<[string, string]> }> = [
    {
        title: 'Subjective style, measured by people',
        what: 'Hipster Wars (Kiapour et al., ECCV 2014) found that 1–10 style ratings were unstable, so it asked "which of these two is more preppy?" and ranked from the comparisons. FashionStyle14 (Takagi et al., 2017) labeled about 13,000 images into 14 styles by experts.',
        used: 'Not used yet. Swipes (wear vs skip) are the same kind of pairwise judgment and could tune scores per person later.',
        links: [['Hipster Wars', 'https://acberg.com/papers/hipster_eccv14.pdf'], ['FashionStyle14', 'https://openaccess.thecvf.com/content_ICCV_2017_workshops/papers/w32/Takagi_What_Makes_a_ICCV_2017_paper.pdf']],
    },
    {
        title: 'A vocabulary for garments',
        what: 'Fashionpedia (Jia et al., ECCV 2020): an expert ontology of 27 garment types, 19 parts and 294 attributes (silhouette, material, neckline).',
        used: 'Model for the keyword lists: rules match garment type and material words. IntakeAgent names the material in the subcategory so they can match.',
        links: [['Fashionpedia', 'https://arxiv.org/pdf/2004.12276']],
    },
    {
        title: 'What goes with what',
        what: 'Polyvore Outfits (Vasileva et al., ECCV 2018): about 68,000 user-assembled outfits for learning type-aware compatibility.',
        used: 'Not used: needs a trained model.',
        links: [['Type-aware embeddings', 'https://openaccess.thecvf.com/content_ECCV_2018/html/Mariya_Vasileva_Learning_Type-Aware_Embeddings_ECCV_2018_paper.html']],
    },
    {
        title: 'Color and mood',
        what: "Kobayashi's Color Image Scale maps 130 colors and 1,000+ combinations to 180 mood words on warm–cool, soft–hard and clear–grayish axes.",
        used: 'Not used yet; the principled replacement for the short color help / hurt lists.',
        links: [['Color Image Scale', 'https://www.goodreads.com/book/show/2151010.Color_Image_Scale']],
    },
    {
        title: 'Professional = business casual',
        what: 'Dress-code guides: chinos, dress trousers, knee or midi skirts, collared shirts, blouses, sweaters, blazers, loafers; no jeans, sneakers, sandals, shorts, graphic or plain tees.',
        used: "Professional's keyword lists.",
        links: [['SEEK', 'https://www.seek.co.nz/career-advice/article/a-guide-to-business-casual-attire-with-examples'], ['What not to wear', 'https://ultimatemedical.edu/blog/what-not-to-wear-in-a-business-casual-office']],
    },
    {
        title: 'Special day and Casual',
        what: 'Special day replaces Romantic (whose rules mostly fit women\'s clothes) with occasion and cocktail dress codes for everyone. Athleisure guides (joggers, leggings, hoodies, track pieces) now feed Casual, since Sporty is retired.',
        used: "Special day's keyword lists and colors; athleisure terms in Casual. Items tagged Romantic count as Special day.",
        links: [['Romantic style (Stitch Fix)', 'https://stitchfix.com/women/blog/?p=76712'], ['Romantic style (Lookiero)', 'https://lookiero.co.uk/blog/what-is-the-romantic-style'], ['Athleisure (Macron)', 'https://www.macron.com/uk/what-is-athleisure']],
    },
    {
        title: 'Dressing for rain',
        what: 'Wet-weather guides: skip suede, canvas and delicate fabrics, keep cotton and denim off the outer layer, wear a waterproof shell with grippy boots, knits only as a layer under the shell.',
        used: "The rain rule. Leather is out in the rain on the product owner's call.",
        links: [['Bespoke Post', 'https://www.bespokepost.com/field-guide/your-five-point-plan-for-rainy-day-style'], ['Permanent Style', 'https://www.permanentstyle.com/2022/05/rain-cap-and-cordovan-or-felt-and-suede.html'], ['FashionUnited', 'https://fashionunited.uk/news/fashion/how-to-dress-well-on-rainy-days/2022072864350'], ['ASOS', 'https://www.asos.com/men/fashion-feed/2025_10_27-mon/rainy-day-outfits']],
    },
    {
        title: 'Warmth by garment',
        what: 'Clothing-insulation (clo) tables from ASHRAE 55 / ISO 9920: a T-shirt about 0.09 clo, trousers + long-sleeved shirt about 0.6, a business suit about 1.0.',
        used: 'Orders the temperature keyword lists. The app uses bands, not clo sums, because garment names do not say how thick a piece is.',
        links: [['Clothing insulation', 'https://en.wikipedia.org/wiki/Clothing_insulation'], ['Engineering ToolBox', 'https://www.engineeringtoolbox.com/clo-clothing-thermal-insulation-d_732.html']],
    },
];

/** Untagged sample pieces scored in the tables below. */
const SAMPLES: Array<[ClothingCategory, string, string]> = [
    [ClothingCategory.Tops, 'Button Down Shirt', 'Blue'],
    [ClothingCategory.Tops, 'Crew Neck T-Shirt', 'White'],
    [ClothingCategory.Tops, 'Wool Knit Sweater', 'Cream'],
    [ClothingCategory.Tops, 'Silk Blouse', 'Pink'],
    [ClothingCategory.Bottoms, 'Slim Jeans', 'Blue'],
    [ClothingCategory.Bottoms, 'Chinos', 'Beige'],
    [ClothingCategory.Bottoms, 'Pleated Skirt', 'Black'],
    [ClothingCategory.Bottoms, 'Joggers', 'Grey'],
    [ClothingCategory.Bottoms, 'Linen Shorts', 'Beige'],
    [ClothingCategory.Outerwear, 'Denim Jacket', 'Blue'],
    [ClothingCategory.Outerwear, 'Blazer', 'Navy'],
    [ClothingCategory.Outerwear, 'Cardigan', 'Beige'],
    [ClothingCategory.Outerwear, 'Leather Biker Jacket', 'Black'],
    [ClothingCategory.Outerwear, 'Waterproof Rain Jacket', 'Navy'],
    [ClothingCategory.Outerwear, 'Trench Coat', 'Beige'],
    [ClothingCategory.Outerwear, 'Puffer Jacket', 'Black'],
    [ClothingCategory.Dresses, 'Wrap Dress', 'Olive'],
    [ClothingCategory.Dresses, 'Sundress', 'White'],
    [ClothingCategory.Shoes, 'Sneakers', 'White'],
    [ClothingCategory.Shoes, 'Suede Loafers', 'Brown'],
    [ClothingCategory.Shoes, 'Ankle Boots', 'Black'],
    [ClothingCategory.Shoes, 'Rain Boots', 'Black'],
    [ClothingCategory.Shoes, 'Strappy Sandals', 'Brown'],
];

const WEATHER_SCENARIOS: Array<{ label: string; temperature: number; condition: string; windSpeed: number; shell?: boolean }> = [
    { label: 'Rain 9 °C', temperature: 9, condition: 'Light Rain', windSpeed: 10 },
    { label: 'Rain 9 °C, owns a raincoat', temperature: 9, condition: 'Light Rain', windSpeed: 10, shell: true },
    { label: 'Cold 2 °C', temperature: 2, condition: 'Clear', windSpeed: 10 },
    { label: 'Mild 20 °C', temperature: 20, condition: 'Sunny', windSpeed: 10 },
    { label: 'Hot 29 °C', temperature: 29, condition: 'Sunny', windSpeed: 10 },
    { label: 'Windy 14 °C', temperature: 14, condition: 'Cloudy', windSpeed: 40 },
];

const list = (words: string[]) => (words.length ? words.map((w) => `\`${w}\``).join(', ') : '—');
const tier = (v: number, high = HIGH_FIT_THRESHOLD, off = OFF_MOOD_THRESHOLD) => (v >= high ? `**${v.toFixed(2)}**` : v < off ? `~~${v.toFixed(2)}~~` : v.toFixed(2));
const sample = ([category, subcategory, color]: [ClothingCategory, string, string]) =>
    ({ category, subcategory, color, userMoods: [], aiTags: [] }) as unknown as ClothingItem;

function weatherRule(rule: WeatherRule): string {
    const k = rule.keywords;
    return [
        `### ${rule.label}`,
        '',
        rule.brief,
        '',
        `- Made for it (+0.30): ${list(k.strong)}`,
        `- Works (+0.15): ${list(k.good)}`,
        `- Mildly wrong (−0.15): ${list(k.poor)}`,
        ...(k.underShellOnly ? [`- Only under a weatherproof layer (otherwise capped at 0.20): ${list(k.underShellOnly)}`] : []),
        `- Breaks it, never sent (capped at 0.20): ${list(k.avoid)}`,
        '',
    ].join('\n');
}

export function renderStyleRulesDoc(): string {
    const moodIds = MOODS.map((m) => m.id);
    const out: string[] = [
        '# Stylemax style rules',
        '',
        '<!-- Generated from src/data/moodStyles.ts and src/data/weatherStyles.ts by src/data/styleRulesDoc.ts. Do not edit by hand: run `npm run docs:style-rules`. A test fails when this file is out of date. -->',
        '',
        "How the Stylist decides what fits a mood and today's weather. Code scores every piece against these rules and removes the ones that clash before the AI picks outfits, then checks every outfit for what the weather requires. See AGENTS.md for how this fits into the agents.",
        '',
        '## Sources',
        '',
    ];
    for (const s of SOURCES) {
        out.push(`- **${s.title}.** ${s.what} *Use:* ${s.used} ${s.links.map(([label, url]) => `[${label}](${url})`).join(' · ')}`);
    }
    out.push(
        '',
        '## Mood scoring',
        '',
        'Every piece starts at 0.50 for each mood; the result is kept between 0 and 1. Keywords match the piece\'s name and free-form tags as whole words. One keyword rule applies, checked in this order:',
        '',
        '| Adjustment | When |',
        '| --- | --- |',
        '| +0.30 | The user tagged the piece with this mood |',
        '| −0.10 | The user tagged it with a different mood only |',
        '| −0.45 | Name matches a "clashes" keyword (beats the tag) |',
        '| +0.35 | Otherwise, matches a "textbook" keyword |',
        '| +0.15 | Otherwise, matches a "works" keyword |',
        '| ±0.05 / −0.10 | Color on the mood\'s help / hurt list |',
        '',
        `${HIGH_FIT_THRESHOLD.toFixed(2)}+ is a strong fit (outfits anchor on these). Below ${OFF_MOOD_THRESHOLD.toFixed(2)} a piece is off-mood and never sent to the AI, unless a group would be too thin to build looks.`,
        '',
        '## Moods',
        '',
    );
    for (const mood of MOODS) {
        const st = MOOD_STYLES[mood.id];
        if (!st) continue;
        out.push(
            `### ${mood.name} (\`${mood.id}\`)`,
            '',
            st.brief,
            '',
            `- **Reach for:** ${st.reachFor}`,
            `- **Shape and fabric:** ${st.shape}`,
            `- **Colors:** ${st.colors}`,
            `- **Breaks the mood:** ${st.avoid}`,
            `- Textbook (+0.35): ${list(st.keywords.strong)}`,
            `- Works (+0.15): ${list(st.keywords.good)}`,
            `- Clashes (−0.45): ${list(st.keywords.avoid)}`,
            `- Colors that help (+0.05): ${list(st.colorAffinity.good)} · hurt (−0.10): ${list(st.colorAffinity.avoid)}`,
            '',
        );
    }
    out.push(
        'Retired moods: Creative and Sporty (stored values ignored; athleisure reads as Casual). Romantic maps to Special day.',
        '',
        '### Sample mood scores',
        '',
        `Untagged pieces, from the app's scoring code. **Bold** = strong fit, ~~struck~~ = off-mood.`,
        '',
        `| Piece | ${MOODS.map((m) => m.name).join(' | ')} |`,
        `| --- | ${moodIds.map(() => '---:').join(' | ')} |`,
    );
    for (const s of SAMPLES) {
        out.push(`| ${s[2]} ${s[1]} | ${moodIds.map((id) => tier(itemMoodFit(sample(s), id))).join(' | ')} |`);
    }
    out.push(
        '',
        '## Weather rules',
        '',
        `The reading becomes one temperature band, read from "feels like", plus rain, snow and wind (${WINDY_KMH} km/h or more). Each active rule scores every piece from 0.50. A match on any rule's "breaks it" list caps the piece at 0.20, so a warm band can't rescue it. Below ${OFF_WEATHER_THRESHOLD.toFixed(2)} a piece is never sent to the AI.`,
        '',
        'Every outfit (the AI\'s and the backup picks) then gets, when the closet has one:',
        '',
        '- Rain or wind: a weatherproof layer (rain jacket, trench, shell, anorak, parka, windbreaker).',
        '- Cold, cool or rain: some outer layer.',
        '- Rain: boots instead of other shoes.',
        '',
        'Card score: `Weather = 40 × season share + 60 × weather fit`, with fit rescaled so 0.20 → 0 and 0.80+ → 1. Without a reading it is `50 + 50 × season share`.',
        '',
    );
    for (const rule of Object.values(BAND_RULES)) out.push(weatherRule(rule));
    for (const rule of Object.values(CONDITION_RULES)) out.push(weatherRule(rule));
    out.push(
        '### Sample weather scores',
        '',
        `Weather fit only. **Bold** = made for it, ~~struck~~ = kept out of outfits that day.`,
        '',
        `| Piece | ${WEATHER_SCENARIOS.map((w) => w.label).join(' | ')} |`,
        `| --- | ${WEATHER_SCENARIOS.map(() => '---:').join(' | ')} |`,
    );
    for (const s of SAMPLES) {
        const cells = WEATHER_SCENARIOS.map((w) =>
            tier(itemWeatherFit(sample(s), readWeather({ temperature: w.temperature, feelsLike: w.temperature, condition: w.condition, windSpeed: w.windSpeed }), { shell: w.shell }), HIGH_FIT_THRESHOLD, OFF_WEATHER_THRESHOLD));
        out.push(`| ${s[2]} ${s[1]} | ${cells.join(' | ')} |`);
    }
    out.push('');
    return out.join('\n');
}

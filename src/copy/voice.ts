/**
 * Stylemax voice: short, warm, a little playful. Never slang, never em dashes.
 * -----------------------------------------------------------------------------
 * Contextual microcopy written in code from real conditions (weather, mood, the actual pieces,
 * how long they have rested, streaks, the day). Each line comes from a small pool and is picked
 * with a seed made of today's date plus the context, so a line stays put while you use the app
 * and changes tomorrow or as soon as the context changes. No model call, so it is instant and free.
 * The AI still writes the outfit notes, weather cheer and Stats tips; this covers everything else.
 */

import type { ClothingItem, WeatherData } from '../types';
import { ClothingCategory } from '../types';

type WeatherLike = Pick<WeatherData, 'temperature' | 'condition'>;
export type WeatherKind = 'storm' | 'snow' | 'rain' | 'wind' | 'hot' | 'warm' | 'mild' | 'cool' | 'cold';

export function weatherKind(w?: WeatherLike | null): WeatherKind | null {
    if (!w) return null;
    const c = w.condition.toLowerCase();
    if (/thunder|storm/.test(c)) return 'storm';
    if (/snow|sleet|hail/.test(c)) return 'snow';
    if (/rain|drizzle|shower/.test(c)) return 'rain';
    if (/wind|breez|gust/.test(c)) return 'wind';
    const t = w.temperature;
    if (t >= 28) return 'hot';
    if (t >= 21) return 'warm';
    if (t >= 14) return 'mild';
    if (t >= 6) return 'cool';
    return 'cold';
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const dayName = (now = new Date()) => DAYS[now.getDay()];

function hash(text: string): number {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Pick from a pool, stable for the day and the given context. */
export function pick(pool: string[], ...context: Array<string | number | null | undefined>): string {
    const now = new Date();
    const day = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    return pool[hash([day, ...context].join('|')) % pool.length];
}

const fill = (line: string, vars: Record<string, string | number>) =>
    line.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

const label = (item: ClothingItem) => `${item.color} ${item.subcategory}`.toLowerCase();

const NEUTRALS = /black|white|grey|gray|beige|cream|ivory|navy|brown|tan|camel|khaki|charcoal|taupe|stone/i;

/** Sign-in greeting that knows the time of day. */
export function welcomeBackLine(now = new Date()): string {
    const h = now.getHours();
    const pool = h < 5 ? ['Up late? Plan tomorrow’s look.', 'Night owl mode. Welcome back.']
        : h < 12 ? ['Morning! Your closet is ready.', 'Good morning. Let’s get dressed.']
            : h < 17 ? ['Good afternoon. Welcome back.', 'Afternoon! Time for a look.']
                : ['Good evening. Welcome back.', 'Evening! Plans tonight?'];
    return pick(pool, h < 5 ? 'n' : h < 12 ? 'm' : h < 17 ? 'a' : 'e');
}

/** Starter picker card question, specific to the piece on the card. */
export function starterQuestion(label: string, category: string): string {
    // Labels can be singular or plural ("Slim Jeans"), so lines never put an article or verb on them.
    const L = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
    const pool = category === ClothingCategory.Shoes ? ['{L} on your shoe rack?', '{L}: yours already?']
        : category === ClothingCategory.Outerwear ? ['{L} on your coat hook?', '{L}: yours already?']
            : ['{L} in your closet?', '{L}: yours already?'];
    return fill(pick(pool, label), { L });
}

// ---------------------------------------------------------------------------------------------
// Today: the note under the rails for the user's own mix
// ---------------------------------------------------------------------------------------------

export interface MixContext {
    items: ClothingItem[];
    weather: WeatherLike | null;
    moodId: string;
    tryItItemIds: string[];
    dustyDays: Map<string, number>;
}

const MOOD_LINES: Record<string, string[]> = {
    professional: ['Sharp, simple, meeting ready.', 'Polished without trying too hard.', 'Clean lines for a busy day.'],
    casual: ['Easy, comfy and still sharp.', 'Low effort, high style.', 'Relaxed, but put together.'],
    sporty: ['Ready to move in style.', 'Built for a busy, active day.', 'Comfy enough to chase the day.'],
    creative: ['A little unexpected. We like it.', 'Mixing it up in the best way.', 'Your own rules today.'],
    romantic: ['Soft, sweet and date ready.', 'A gentle look for a lovely day.', 'Just the right amount of charm.'],
};

/** A useful, specific line about the combination on the rails. */
export function mixNote({ items, weather, moodId, tryItItemIds, dustyDays }: MixContext): string {
    const key = items.map((i) => i.id).join(',');
    const kind = weatherKind(weather);
    const temp = weather ? Math.round(weather.temperature) : 0;
    const outer = items.find((i) => i.category === ClothingCategory.Outerwear);

    const tried = items.find((i) => tryItItemIds.includes(i.id));
    if (tried) {
        return fill(pick([
            'Starring the {n} you wanted to try.',
            'Finally, a turn for the {n}.',
            'The {n} you saved for later? Today is the day.',
        ], key), { n: label(tried) });
    }

    // Practical weather advice first: it is the most useful thing we can say.
    if (!outer && (kind === 'cold' || kind === 'snow' || kind === 'storm' || (kind === 'wind' && temp < 18))) {
        return fill(pick(['Chilly out. A layer would help.', 'It is {t}° out. Grab a layer before you go.', 'Brr. Add a layer and you are set.'], key), { t: temp });
    }
    if (outer && kind === 'hot') {
        return fill(pick(['It is {t}° today. You could skip the layer.', 'Warm one. Maybe leave the {o} at home.'], key), { t: temp, o: outer.subcategory.toLowerCase() });
    }
    if (outer && (kind === 'rain' || kind === 'storm')) {
        return pick(['Layer on, rain handled.', 'Rain ready and still sharp.', 'Let it pour. You are covered.'], key);
    }

    const dusty = items.find((i) => dustyDays.has(i.id));
    if (dusty) {
        return fill(pick([
            'Back after {d} days: your {n}. Welcome back!',
            '{d} days later, a comeback for the {n}.',
            'Giving your {n} some fresh air.',
        ], key), { n: label(dusty), d: dustyDays.get(dusty.id) ?? 21 });
    }

    // Colour story.
    const colors = items.map((i) => i.color);
    const bright = items.find((i) => !NEUTRALS.test(i.color));
    if (items.length > 1 && colors.every((c) => NEUTRALS.test(c))) {
        return pick(['All neutrals. Calm, clean, done.', 'Quiet colors, sharp look.', 'Neutral and never boring.'], key);
    }
    const repeated = colors.find((c, i) => colors.indexOf(c) !== i);
    if (repeated) {
        return fill(pick(['{c} on {c}. Bold move, good move.', 'Head to toe {c}. Very put together.'], key), { c: repeated.toLowerCase() });
    }
    if (bright) {
        return fill(pick(['A fun twist from the {n}.', 'One pop of {c}. Just right.', 'A splash of {c} for {day}.'], key), {
            n: label(bright), c: bright.color.toLowerCase(), day: dayName(),
        });
    }

    return pick(MOOD_LINES[moodId] ?? ['Your own mix. Lock what you love, then spin the rest.'], key);
}

/** While the stylist works: mention what it is actually matching. */
export function stylistLoadingLine(moodName: string, weather: WeatherLike | null): string {
    const cond = weather ? weather.condition.toLowerCase() : 'forecast';
    return fill(pick([
        'Matching {m} looks to the {c}…',
        'Your stylist is reading the {c}…',
        'Pulling {m} pieces off the rails…',
    ], moodName, cond), { m: moodName.toLowerCase(), c: cond });
}

// ---------------------------------------------------------------------------------------------
// Saving a wear
// ---------------------------------------------------------------------------------------------

const WEATHER_SENDOFF: Partial<Record<WeatherKind, string[]>> = {
    rain: ['Stay dry out there!', 'Umbrella, then go!', 'Rain cannot touch this look.'],
    storm: ['Stay safe out there.', 'Stormy out. Stay cozy.'],
    snow: ['Bundle up and go!', 'Cozy and ready for the snow.'],
    wind: ['Hold on to your hat!', 'Windproof and wonderful.'],
    hot: ['Stay cool out there!', 'Sunscreen is the best accessory.'],
    cold: ['Warm and ready.', 'Toasty and sharp.'],
};

const MOOD_SENDOFF: Record<string, string[]> = {
    professional: ['Go nail that meeting.', 'Boardroom ready.'],
    casual: ['Easy day ahead.', 'Comfy and cute.'],
    sporty: ['Go move!', 'Ready to roll.'],
    creative: ['Go turn some heads.', 'Wear it with flair.'],
    romantic: ['Have a lovely time.', 'Date night ready.'],
};

/** "Saved." plus a send-off that fits the day. */
export function wearSavedLine(ctx: { items: ClothingItem[]; weather: WeatherLike | null; moodId: string; dustyDays?: Map<string, number> }): string {
    const key = ctx.items.map((i) => i.id).join(',');
    const dusty = ctx.dustyDays ? ctx.items.find((i) => ctx.dustyDays!.has(i.id)) : undefined;
    if (dusty) return fill(pick(['Saved. Welcome back, {n}!', 'Saved. A big day for the {n}!'], key), { n: label(dusty) });
    const kind = weatherKind(ctx.weather);
    const pool = (kind && WEATHER_SENDOFF[kind]) || MOOD_SENDOFF[ctx.moodId] || ['Have a great {day}!'];
    return `Saved. ${fill(pick(pool, key), { day: dayName() })}`;
}

/** A short send-off for the end of the Picks stack. */
export function sendOff(weather: WeatherLike | null, moodId: string): string {
    const kind = weatherKind(weather);
    const pool = (kind && WEATHER_SENDOFF[kind]) || MOOD_SENDOFF[moodId] || ['Have a great {day}!'];
    return fill(pick(pool, moodId, kind), { day: dayName() });
}

// ---------------------------------------------------------------------------------------------
// Closet
// ---------------------------------------------------------------------------------------------

const DUSTY_BY_CATEGORY: Record<string, string[]> = {
    [ClothingCategory.Tops]: ['Resting {d} days. Brunch, maybe?', '{d} days off. Ready for a comeback.'],
    [ClothingCategory.Bottoms]: ['{d} days on the shelf. Take it for a walk?', 'Sitting out {d} days. Pair it up?'],
    [ClothingCategory.Outerwear]: ['{d} days on the hook. Weather check?', 'Hanging around {d} days. Coat weather soon?'],
    [ClothingCategory.Dresses]: ['{d} days waiting for an occasion. Make one up?', 'Resting {d} days. Any plans this {day}?'],
    [ClothingCategory.Shoes]: ['{d} days in the box. Time for a stroll?', 'Off duty {d} days. Lace up?'],
};

export function dustyLine(item: ClothingItem, days: number): string {
    return fill(pick(DUSTY_BY_CATEGORY[item.category] ?? ['Resting {d} days. Give it a turn?'], item.id), { d: days, day: dayName() });
}

export function wornLine(item: ClothingItem): string {
    const n = item.wearFrequency;
    const pool = n === 0 ? ['Not worn yet. Fresh and waiting.', 'Brand new to the rotation.']
        : n <= 2 ? ['Worn {n}×. Still getting acquainted.', 'Worn {n}×. Just warming up.']
            : n <= 9 ? ['Worn {n}×. A solid regular.', 'Worn {n}×. Reliable as ever.']
                : ['Worn {n}×. A true favorite.', 'Worn {n}×. You two are inseparable.'];
    return fill(pick(pool, item.id), { n });
}

// ---------------------------------------------------------------------------------------------
// Picks, streaks, Stats
// ---------------------------------------------------------------------------------------------

export function picksDoneLine(wornLook: number | null, weather: WeatherLike | null, moodId: string): string {
    if (wornLook != null) return `Look ${wornLook + 1} it is. ${sendOff(weather, moodId)}`;
    return pick(['Every skip helps your stylist learn your taste.', 'None felt right? Your stylist is taking notes.', 'Picky is good. Your stylist is learning.'], moodId);
}

export function streakLine(current: number, loggedToday: boolean): string {
    const day = dayName();
    if (current > 0 && loggedToday) {
        if (current >= 7) return fill(pick(['{n} days in a row. That is a habit now!', 'A week plus of looks. Impressive!'], current), { n: current });
        if (current === 1) return pick(['Styled today. See you tomorrow!', 'Day one done. Nice start.'], current);
        return fill(pick(['{n} days in a row. On a roll!', '{n} days strong. Same time tomorrow?'], current), { n: current });
    }
    if (current > 0) return fill(pick(['Wear a look today to keep it going.', 'Your streak is waiting for today’s look.'], current, day), { n: current });
    return fill(pick(['Wear a look today to start one.', 'Every streak starts with one {day} outfit.'], day), { day });
}

export function forgottenSubtitle(count: number, season: string): string {
    return fill(pick([
        '{n} pieces have not seen {s} yet. Give one a turn?',
        'Unworn for 3 weeks. Pick one for {day}?',
        'Quiet lately. One of these could steal the show.',
    ], count, season), { n: count, s: season, day: dayName() });
}

export function goToSubtitle(top: ClothingItem | undefined, count: number): string {
    if (!top) return 'Most worn in the last 3 weeks.';
    return fill(pick(['Leading the pack: your {n}.', 'On repeat lately: your {n}, {c} times.', 'Most worn lately: your {n}.'], top.id, count), { n: label(top), c: count });
}

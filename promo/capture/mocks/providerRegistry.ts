// Demo "model" layer: the REAL Intake / Stylist / Behavioral agents run unchanged and call this
// provider; it returns canned Nova-style JSON after a short delay (no network, no keys).
import { demoDelay } from './demoUser';

type Req = { prompt?: string; systemPrompt?: string };
type Opts = { agent: string; traceId: string };

// ---- Stylist: outfits by mood (item IDs from the seeded wardrobe) ----
const O = (itemIds: string[], explanation: string) => ({ itemIds, weatherMatch: 95, wearScore: 90, explanation });
const STYLIST: Record<string, ReturnType<typeof O>[]> = {
    casual: [
        O(['out-denim-jacket', 'top-white-tee', 'bot-black-jeans', 'shoe-black-boots'],
            'Your blue denim jacket is finally back, layered over a crisp white tee with black jeans and ankle boots. Easy, cool and exactly right for a breezy fall afternoon.'),
        O(['out-olive-cardigan', 'top-pink-blouse', 'bot-navy-skirt', 'shoe-brown-loafers'],
            'Soft pink silk meets a navy pleated skirt, wrapped in an olive cardigan like a warm hug. Brown loafers keep it grounded and quietly charming.'),
        O(['dress-olive-slip', 'out-beige-blazer', 'shoe-brown-loafers'],
            'The olive slip dress you wanted to try, sharpened with a beige blazer and brown loafers. Effortless enough for coffee, polished enough for anything after.'),
    ],
    creative: [
        O(['out-beige-blazer', 'top-black-tee', 'bot-navy-skirt', 'shoe-black-boots'],
            'A tailored beige blazer over a black tee, then a swishy navy pleated skirt and ankle boots for edge. Unexpected, confident and totally you.'),
        O(['out-denim-jacket', 'top-pink-blouse', 'bot-black-jeans', 'shoe-brown-loafers'],
            'Pink silk under rugged blue denim is the contrast that makes people look twice. Black jeans and brown loafers turn it into pure gallery opening energy.'),
        O(['dress-olive-slip', 'out-beige-blazer', 'shoe-black-boots'],
            'Your olive slip dress gets a moody fall edit with a beige blazer and black ankle boots. Poetic, a little rebellious, and ready for its moment.'),
    ],
    professional: [
        O(['out-beige-blazer', 'top-white-shirt', 'bot-grey-trousers', 'shoe-brown-loafers'],
            'A beige blazer over a crisp white shirt with grey wool trousers reads calm and in charge. Brown loafers add warmth to a look that means business.'),
        O(['top-navy-knit', 'bot-beige-trousers', 'shoe-brown-loafers'],
            'A navy knit with beige tailored trousers is quiet luxury for the office. Polished, comfortable and effortlessly sharp.'),
        O(['dress-black-wrap', 'out-camel-coat', 'shoe-black-boots'],
            'Black wrap dress, camel wool coat, sleek ankle boots. Boardroom ready with an elegant after hours glow.'),
    ],
    sporty: [
        O(['top-grey-hoodie', 'bot-blue-jeans', 'shoe-white-sneakers'],
            'A grey hoodie, blue jeans and white sneakers is weekend energy in its purest form. Grab a coffee and go.'),
        O(['out-denim-jacket', 'top-white-tee', 'bot-black-jeans', 'shoe-white-sneakers'],
            'Denim jacket over a white tee with black jeans and clean sneakers. Light, easy and ready to move.'),
        O(['top-black-tee', 'bot-blue-jeans', 'shoe-white-sneakers'],
            'Black tee, blue jeans, white sneakers. Simple, sporty and made for a day on your feet.'),
    ],
    romantic: [
        O(['dress-olive-slip', 'out-olive-cardigan', 'shoe-brown-loafers'],
            'Your olive slip dress softened with a cozy knit cardigan and brown loafers. Tender, dreamy and perfect for golden hour.'),
        O(['top-pink-blouse', 'bot-navy-skirt', 'shoe-black-boots'],
            'Pink silk and a navy pleated skirt feel like a love letter to fall. Ankle boots keep it modern.'),
        O(['out-camel-coat', 'dress-black-wrap', 'shoe-black-boots'],
            'A black wrap dress under a camel wool coat is timeless date night elegance. Walk in like you own the evening.'),
    ],
};
const calls: Record<string, number> = {};

function stylistResponse(prompt: string): string {
    const m = prompt.match(/Desired Mood\/Vibe: ([A-Za-z]+)/);
    const mood = (m?.[1] ?? 'Casual').toLowerCase();
    const set = STYLIST[mood] ?? STYLIST.casual;
    // Suggest-page calls carry a behavioral hint; regenerations rotate the order for variety.
    // (Deterministic order: React StrictMode double-invokes effects in dev, so no rotation.)
    const rotated = set; void calls;
    return JSON.stringify(rotated.map((o) => ({ ...o, moodName: m?.[1] ?? 'Casual' })));
}

// ---- Behavioral: 3 nudges in 3 voices ----
function behavioralResponse(): string {
    return JSON.stringify({
        suggestedVariations: [
            "Your blue denim jacket hasn't seen sunlight in 3 weeks. It's begging for a sunny afternoon, so give it one tomorrow.",
            "White sneakers in 10 of your last 18 looks? Iconic, but your brown loafers are starting to feel a little left out.",
            "Your olive slip dress and navy pleated skirt are the untold chapters of this closet; the most interesting story is always the one you haven't worn yet.",
        ],
    });
}

// ---- Intake: the leather jacket photographed on the bed ----
function intakeResponse(): string {
    const cfg = (window as any).__DEMO__ ?? {};
    return JSON.stringify(cfg.intakeItems ?? [
        {
            isRestricted: false,
            category: 'outerwear',
            subcategory: 'Leather Biker Jacket',
            color: 'Black',
            colorHex: '#1E1E1F',
            season: ['spring', 'fall'],
            mood: ['creative', 'casual'],
            hasNoisyBackground: false,
            bbox: { x: 0.0, y: 0.33, width: 0.95, height: 0.67 },
            confidence: 0.94,
        },
    ]);
}

const demoProvider = {
    id: 'nova-2-lite',
    label: 'Amazon Nova 2 Lite (demo)',
    isConfigured: () => true,
    async call(_req: Req, _opts: Opts): Promise<string> {
        await demoDelay('intake');
        return intakeResponse();
    },
    async callText(req: Req, opts: Opts): Promise<string> {
        await demoDelay('ai');
        if (opts.agent === 'stylist') return stylistResponse(req.prompt ?? '');
        if (opts.agent === 'behavioral') return behavioralResponse();
        return '{}';
    },
};

export function listProviders() { return [demoProvider]; }
export function listConfiguredProviders() { return [demoProvider]; }
export function getProviderById(_id: string) { return demoProvider; }
export function getActiveProvider() { return demoProvider; }
export function getTextProvider() { return demoProvider; }

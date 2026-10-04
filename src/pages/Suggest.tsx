import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Check, Loader2, RefreshCw, Sparkles, SlidersHorizontal } from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { type ClothingItem, type OutfitSuggestion } from '../types';
import {
    computeSeasonalLeastWornIds,
    computeWearScore,
    computeWeatherMatch,
    describeOutfitReason,
    getWardrobeReadiness,
} from '../services/agents/agentOutputGuards';
import { useMood } from '../hooks/useMood';
import { useTodayWeather } from '../hooks/useTodayWeather';
import { useStylistLooks } from '../hooks/useStylistLooks';
import { usePendingWear } from '../hooks/usePendingWear';
import { MoodChips } from '../components/common/MoodChips';
import { picksDoneLine, stylistLoadingLine, wearSavedLine } from '../copy/voice';
import { PageHeader } from '../components/common/PageHeader';
import { WearToast } from '../components/common/WearToast';
import { MirrorCard } from '../components/picks/MirrorCard';
import { SwipeDeck, type SwipeDeckHandle, type SwipeDir } from '../components/picks/SwipeDeck';
import { daysIdle, buildReelOptions, itemsFromSlots, slotsFromItems, type OutfitSlots, type SlotId } from '../utils/outfitSlots';

interface DeckState {
    key: string;
    index: number;
    /** Per-look piece swaps made in the mirror. */
    overrides: Record<string, Partial<OutfitSlots>>;
    wornLook: number | null;
}

const freshDeck = (key: string): DeckState => ({ key, index: 0, overrides: {}, wornLook: null });

/**
 * Picks — the stylist's 3 looks as a stack of mirror cards. Swipe right to wear (4s undo), left to
 * skip (logged as a rejection signal for the Stylist), up to tweak the look on Today's rails. Tap a
 * piece in the mirror to swap it for another of the same kind.
 */
const Suggest: React.FC = () => {
    const { clothes, outfits, tryItItemIds, logSuggestionEvent } = useWardrobe();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [mood, setMood] = useMood();
    const { weather, isLoading: weatherLoading } = useTodayWeather();
    const readiness = getWardrobeReadiness(clothes);
    const { looks, isLoading, error, regenerate } = useStylistLooks(mood, readiness.canMakeOutfit ? weather : null);
    const { wear, undo, isPending, logged } = usePendingWear();
    const deckRef = useRef<SwipeDeckHandle>(null);
    // Deck progress belongs to one batch of looks. Keyed on look ids, so a logged wear (which
    // refreshes item data) keeps the stack where it is, while a new batch starts it over.
    const looksKey = looks.map((l) => l.id).join(',');
    const [deck, setDeck] = useState<DeckState>(() => freshDeck(looksKey));
    const current = deck.key === looksKey ? deck : freshDeck(looksKey);
    const { index, overrides, wornLook } = current;
    const updateDeck = (patch: Partial<DeckState>) => setDeck({ ...current, ...patch });

    // Deep links like /suggest?mood=romantic still work.
    const moodParam = searchParams.get('mood');
    useEffect(() => {
        if (moodParam) setMood(moodParam);
    }, [moodParam, setMood]);

    const options = useMemo(() => buildReelOptions(clothes), [clothes]);
    const leastWornIds = useMemo(() => computeSeasonalLeastWornIds(clothes, outfits), [clothes, outfits]);
    const dustyDays = useMemo(() => {
        const byId = new Map(clothes.map((c) => [c.id, c]));
        const ids = computeSeasonalLeastWornIds(clothes, outfits, clothes.length);
        return new Map(ids.map((id) => [id, byId.get(id) ? daysIdle(byId.get(id)!) : 0] as const));
    }, [clothes, outfits]);
    const [savedText, setSavedText] = useState<string | undefined>();

    const effective = (look: OutfitSuggestion): OutfitSuggestion => {
        const o = overrides[look.id];
        if (!o) return look;
        const items = itemsFromSlots({ ...slotsFromItems(look.items), ...o }, clothes);
        return {
            ...look,
            items,
            weatherMatch: weather ? computeWeatherMatch(items, weather.temperature) : look.weatherMatch,
            wearScore: computeWearScore(items, clothes),
        };
    };

    /** Alternatives of the same kind (a dress swaps for a dress, a bottom for a bottom). */
    const alternatives = (slot: SlotId, current: ClothingItem | undefined): ClothingItem[] =>
        options[slot].filter((o): o is ClothingItem => Boolean(o) && (!current || o!.category === current.category));

    const swap = (look: OutfitSuggestion, slot: SlotId) => {
        const eff = effective(look);
        const ids = slotsFromItems(eff.items);
        const current = eff.items.find((i) => i.id === ids[slot]);
        const alts = alternatives(slot, current);
        if (alts.length < 2) return;
        const next = alts[(alts.findIndex((a) => a.id === ids[slot]) + 1) % alts.length];
        updateDeck({ overrides: { ...overrides, [look.id]: { ...overrides[look.id], [slot]: next.id } } });
    };

    const onSwipe = (key: string, dir: SwipeDir) => {
        const lookIndex = looks.findIndex((l) => l.id === key);
        const look = looks[lookIndex];
        if (!look) return;
        const items = effective(look).items;
        const ids = items.map((i) => i.id);
        if (dir === 'up') {
            navigate('/', { state: { slots: slotsFromItems(items) } });
            return;
        }
        let worn = wornLook;
        if (dir === 'right' && weather) {
            setSavedText(wearSavedLine({ items, weather, moodId: mood.id, dustyDays }));
            wear(ids, mood.id, weather);
            worn = lookIndex;
        }
        if (dir === 'left') void logSuggestionEvent('skipped', ids, mood.id);
        updateDeck({ index: lookIndex + 1, wornLook: worn });
    };

    const showDifferent = async () => {
        const current = looks[index];
        if (current) void logSuggestionEvent('regenerated', effective(current).items.map((i) => i.id), mood.id);
        await regenerate();
    };

    const remaining = looks.slice(index);
    const done = looks.length > 0 && index >= looks.length;
    const loading = (isLoading || (weatherLoading && !weather)) && looks.length === 0;

    const cards = remaining.map((look, j) => {
        const eff = effective(look);
        return {
            key: look.id,
            node: (
                <MirrorCard
                    look={eff}
                    index={index + j}
                    total={looks.length}
                    reason={look.isFallback ? null : describeOutfitReason(eff, { tryItItemIds, leastWornItemIds: leastWornIds }, weather ?? undefined)}
                    onSwap={j === 0 ? (slot) => swap(look, slot) : undefined}
                    canSwap={(slot) => {
                        const ids = slotsFromItems(eff.items);
                        const current = eff.items.find((i) => i.id === ids[slot]);
                        return Boolean(current) && alternatives(slot, current).length > 1;
                    }}
                />
            ),
        };
    });

    let body: React.ReactNode;
    if (clothes.length === 0 || !readiness.canMakeOutfit) {
        body = (
            <div className="h-full flex flex-col items-center justify-center text-center rounded-[30px] border-2 border-dashed border-ink/40 p-6">
                <h2 className="font-display text-2xl font-extrabold text-ink">{clothes.length === 0 ? 'Your closet is empty' : 'Almost there'}</h2>
                <p className="text-sm text-ink/60 mt-2 mb-5">
                    {clothes.length === 0
                        ? 'Add a few pieces and your stylist gets to work.'
                        : `Add ${readiness.missingForOutfit.join(' and ')} and your stylist can start.`}
                </p>
                <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('open-scanner'))} className="h-12 px-6 rounded-full bg-ink text-paper text-sm font-bold">
                    Add clothes
                </button>
            </div>
        );
    } else if (loading) {
        body = (
            <div className="h-full flex flex-col rounded-[30px] bg-white border-2 border-ink p-5" aria-busy="true">
                <div className="flex-1 flex items-center justify-center">
                    <div className="h-[80%] aspect-[0.8] rounded-t-[999px] rounded-b-2xl skeleton" />
                </div>
                <p className="flex items-center justify-center gap-2 text-sm font-semibold text-ink/60">
                    <Loader2 className="w-4 h-4 animate-spin" /> {stylistLoadingLine(mood.name, weather)}
                </p>
            </div>
        );
    } else if (error && looks.length === 0) {
        body = (
            <div className="h-full flex flex-col items-center justify-center text-center rounded-[30px] border-2 border-dashed border-ink/40 p-6">
                <h2 className="font-display text-2xl font-extrabold text-ink">A little hiccup</h2>
                <p className="text-sm text-ink/60 mt-2 mb-5">{error}</p>
                <button type="button" onClick={() => void regenerate()} className="h-12 px-6 rounded-full bg-ink text-paper text-sm font-bold inline-flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Try again
                </button>
            </div>
        );
    } else if (done || looks.length === 0) {
        body = (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 rounded-[30px] border-2 border-dashed border-ink p-6 animate-scale-in">
                <h2 className="font-display text-[28px] leading-tight font-extrabold text-ink">
                    {looks.length === 0 ? 'No looks for this mood yet' : 'That’s all three!'}
                </h2>
                <p className="text-sm text-ink/70">
                    {picksDoneLine(wornLook, weather, mood.id)}
                </p>
                <button type="button" onClick={() => void showDifferent()} disabled={isLoading} className="h-12 px-5 rounded-full bg-ink text-paper text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60">
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Show me more
                </button>
                <button type="button" onClick={() => navigate('/')} className="h-11 px-5 rounded-full border-[1.5px] border-ink text-sm font-bold">
                    Build my own
                </button>
            </div>
        );
    } else {
        body = <SwipeDeck ref={deckRef} cards={cards} onSwipe={onSwipe} stamps={{ right: 'WEAR', left: 'SKIP', up: 'TWEAK' }} />;
    }

    const deckActive = !loading && !done && looks.length > 0 && readiness.canMakeOutfit && !(error && looks.length === 0);

    return (
        <div className="space-y-4">
            <PageHeader
                title="Picks"
                eyebrow={`3 AI looks · ${mood.name}${weather ? ` · ${Math.round(weather.temperature)}° ${weather.condition.toLowerCase()}` : ''}`}
            />

            <MoodChips value={mood.id} onChange={setMood} />

            <div className="relative h-[clamp(320px,calc(100dvh-380px),560px)]">{body}</div>

            {deckActive && (
                <div className="flex items-center justify-center gap-5 pt-6 [@media(max-height:760px)]:pt-5">
                    <button type="button" onClick={() => deckRef.current?.swipe('left')} aria-label="Skip this look" className="w-[60px] h-[60px] rounded-full border-2 border-ink bg-white text-ink flex items-center justify-center active:scale-95">
                        <X className="w-6 h-6" />
                    </button>
                    <button type="button" onClick={() => deckRef.current?.swipe('up')} aria-label="Tweak this look on Today’s rails" className="w-[50px] h-[50px] rounded-full border-2 border-ink bg-paper text-ink flex items-center justify-center active:scale-95">
                        <SlidersHorizontal className="w-5 h-5" />
                    </button>
                    <button type="button" onClick={() => deckRef.current?.swipe('right')} disabled={!weather} aria-label="Wear this look" className="w-[60px] h-[60px] rounded-full border-2 border-ink bg-lime text-ink flex items-center justify-center active:scale-95 disabled:opacity-50">
                        <Check className="w-6 h-6" />
                    </button>
                </div>
            )}

            {deckActive && (
                <p className="[@media(max-height:760px)]:hidden text-center text-[11px] text-ink/50">
                    Right: wear · Left: skip · Up: tweak · Tap a piece to swap
                </p>
            )}

            <WearToast isPending={isPending} logged={logged} savedText={savedText} onUndo={() => { undo(); updateDeck({ wornLook: null }); }} />
        </div>
    );
};

export default Suggest;

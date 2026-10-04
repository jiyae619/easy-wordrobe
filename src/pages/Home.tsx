import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Cloud, CloudRain, Sun, Wind, Dices, ChevronDown } from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { ClothingCategory } from '../types';
import {
    computeSeasonalLeastWornIds,
    computeWearScore,
    computeWeatherMatch,
    getWardrobeCompleteness,
    getWardrobeReadiness,
} from '../services/agents/agentOutputGuards';
import { useMood } from '../hooks/useMood';
import { useTodayWeather } from '../hooks/useTodayWeather';
import { useStylistLooks } from '../hooks/useStylistLooks';
import { usePendingWear } from '../hooks/usePendingWear';
import { HangerReel, type HangerReelHandle } from '../components/today/HangerReel';
import { MoodChips } from '../components/common/MoodChips';
import { PageHeader } from '../components/common/PageHeader';
import { WearToast } from '../components/common/WearToast';
import { StreakCard } from '../components/home/StreakCard';
import {
    SLOT_ORDER,
    assembleCodeSlots,
    buildReelOptions,
    daysIdle,
    isDress,
    isValidOutfit,
    itemsFromSlots,
    pickLookForLocks,
    slotForItem,
    slotsFromItems,
    type OutfitSlots,
    type SlotId,
} from '../utils/outfitSlots';
import { haptic } from '../utils/motion';
import { useShortScreen } from '../hooks/useShortScreen';
import { mixNote, stylistLoadingLine, wearSavedLine } from '../copy/voice';

const REEL: Record<SlotId, { label: string; none: string; size: number }> = {
    layer: { label: 'Layer', none: 'No layer', size: 80 },
    top: { label: 'Top', none: 'No top', size: 80 },
    bottom: { label: 'Bottom', none: '', size: 88 },
    shoes: { label: 'Shoes', none: 'No shoes', size: 60 },
};

/** Smaller garments on short phones (iPhone SE / mini) so the whole builder fits one screen. */
const COMPACT_SIZE: Record<SlotId, number> = { layer: 62, top: 62, bottom: 70, shoes: 48 };

/** The centre "fitting spot" every rail lands its chosen piece in. */
const SPOT_WIDTH = 120;
const SPOT_WIDTH_COMPACT = 100;

const EMPTY_SLOTS: OutfitSlots = { layer: null, top: null, bottom: null, shoes: null };

/** Normalized identity of an outfit, so a rail combination can be matched to an AI look. */
const outfitKey = (ids: string[]) => [...ids].sort().join('|');

const WeatherIcon: React.FC<{ condition?: string }> = ({ condition = '' }) => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain className="w-4 h-4" />;
    if (c.includes('cloud')) return <Cloud className="w-4 h-4" />;
    if (c.includes('wind')) return <Wind className="w-4 h-4" />;
    return <Sun className="w-4 h-4" />;
};

/**
 * Today — the outfit builder. Each slot (layer / top / bottom / shoes) is a clothes rail you swipe;
 * garments swing on their hooks. Lock the pieces you love and tap Spin: the rails run like a slot
 * machine and land on the AI stylist's looks (fetched once, cached for the session), then on
 * code-assembled combinations once the batch is used up.
 */
const Home: React.FC = () => {
    const { clothes, outfits, tryItItemIds } = useWardrobe();
    const location = useLocation();
    const navigate = useNavigate();
    const [mood, setMood] = useMood();
    const { weather, outlook, cheer, isLoading: weatherLoading, usingDefaultLocation } = useTodayWeather();
    const readiness = getWardrobeReadiness(clothes);
    const { looks, isLoading: looksLoading } = useStylistLooks(mood, readiness.canMakeOutfit ? weather : null);
    const { wear, undo, isPending, logged } = usePendingWear();
    const compact = useShortScreen();
    const spotWidth = compact ? SPOT_WIDTH_COMPACT : SPOT_WIDTH;
    const sizeFor = (slot: SlotId) => (compact ? COMPACT_SIZE[slot] : REEL[slot].size);

    const options = useMemo(() => buildReelOptions(clothes), [clothes]);
    const optionsKey = SLOT_ORDER.map((s) => options[s].map((o) => o?.id ?? '-').join(',')).join('|');
    const leastWornIds = useMemo(() => computeSeasonalLeastWornIds(clothes, outfits), [clothes, outfits]);
    const dustyDays = useMemo(() => {
        const ids = computeSeasonalLeastWornIds(clothes, outfits, clothes.length);
        const byId = new Map(clothes.map((c) => [c.id, c]));
        return new Map(ids.map((id) => [id, byId.get(id) ? daysIdle(byId.get(id)!) : 0] as const));
    }, [clothes, outfits]);
    const priorityIds = useMemo(() => new Set([...tryItItemIds, ...leastWornIds]), [tryItItemIds, leastWornIds]);

    // Hand-offs via router state: a whole look from Picks ("Tweak"), or one piece from Closet
    // ("Style it") which arrives locked so Spin builds around it.
    const routeState = location.state as { slots?: OutfitSlots; lockItemId?: string } | null;
    const lockItem = routeState?.lockItemId ? clothes.find((c) => c.id === routeState.lockItemId) ?? null : null;
    const lockSlot = lockItem ? slotForItem(lockItem) : null;
    const incoming = routeState?.slots
        ?? (lockItem && lockSlot ? assembleCodeSlots(options, { [lockSlot]: lockItem.id }, priorityIds, weather?.temperature ?? null, 0) : null);
    const touched = useRef(Boolean(incoming));
    const autoLanded = useRef(false);
    const spinState = useRef({ cursor: 0, used: 0, seed: 1 });
    const reelRefs = useRef<Partial<Record<SlotId, HangerReelHandle | null>>>({});
    const [slots, setSlots] = useState<OutfitSlots>(incoming ?? EMPTY_SLOTS);
    const [locks, setLocks] = useState<Set<SlotId>>(() => new Set(lockSlot ? [lockSlot] : []));
    const [spinTurns, setSpinTurns] = useState(0);
    const [showWeather, setShowWeather] = useState(false);
    const [savedText, setSavedText] = useState<string | undefined>();
    const [reelVersion, setReelVersion] = useState(0);
    const initialized = useRef(Boolean(incoming));

    // Router hand-offs are consumed once.
    useEffect(() => {
        if (routeState) navigate(location.pathname, { replace: true, state: null });
    }, [routeState, navigate, location.pathname]);

    const indexFor = (slot: SlotId, s: OutfitSlots = slots) => {
        const i = options[slot].findIndex((o) => (o?.id ?? null) === s[slot]);
        return i < 0 ? 0 : i;
    };

    const land = (next: OutfitSlots) => {
        const nextIsDress = isDress(clothes.find((c) => c.id === next.bottom));
        let order = 0;
        SLOT_ORDER.forEach((slot) => {
            if (locks.has(slot) || options[slot].length === 0) return;
            if (slot === 'top' && nextIsDress) return; // a dress leaves the top reel where it is
            const idx = options[slot].findIndex((o) => (o?.id ?? null) === next[slot]);
            if (idx < 0) return;
            reelRefs.current[slot]?.spinTo(idx, { delay: order * 110, duration: 950 + order * 230, turns: 2 });
            order += 1;
        });
    };

    // Until the user takes over, the reels show the best available look: a code-assembled one
    // straight away, then they spin onto the stylist's first pick as soon as it arrives.
    useEffect(() => {
        if (touched.current || clothes.length === 0) return;
        if (looks.length > 0 && !autoLanded.current) {
            const next = slotsFromItems(looks[0].items);
            autoLanded.current = true;
            spinState.current = { cursor: 1, used: 1, seed: spinState.current.seed };
            if (initialized.current) {
                land(next);
            } else {
                setSlots(next);
                setReelVersion((v) => v + 1);
            }
            initialized.current = true;
        } else if (!initialized.current) {
            setSlots(assembleCodeSlots(options, {}, priorityIds, weather?.temperature ?? null, 0));
            setReelVersion((v) => v + 1);
            initialized.current = true;
        }
        // optionsKey stands in for `options` (same content, stable identity); land/priorityIds are
        // read at the moment the stylist's look arrives on purpose.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [optionsKey, looks, clothes.length]);

    // A new batch (mood change, regenerate) restarts the walk through the AI looks. Keyed on look
    // ids: a logged wear refreshes item data but is not a new batch.
    const looksKey = looks.map((l) => l.id).join(',');
    useEffect(() => {
        if (touched.current) spinState.current = { cursor: 0, used: 0, seed: spinState.current.seed };
    }, [looksKey]);

    // Changing the mood hands the reels back to the stylist: they spin onto the new mood's first look.
    const changeMood = (id: string) => {
        if (id === mood.id) return;
        touched.current = false;
        autoLanded.current = false;
        setMood(id);
    };

    const markTouched = useCallback(() => { touched.current = true; }, []);

    const spin = () => {
        touched.current = true;
        haptic(12);
        setSpinTurns((t) => t + 1);
        const locked: Partial<OutfitSlots> = {};
        locks.forEach((s) => { locked[s] = slots[s]; });
        const st = spinState.current;
        let next: OutfitSlots;
        if (looks.length > 0 && st.used < looks.length) {
            const idx = pickLookForLocks(looks, locked, st.cursor);
            st.cursor = idx + 1;
            st.used += 1;
            next = { ...slotsFromItems(looks[idx].items), ...locked };
        } else {
            next = assembleCodeSlots(options, locked, priorityIds, weather?.temperature ?? null, st.seed++);
        }
        land(next);
    };

    const toggleLock = (slot: SlotId) => {
        touched.current = true;
        setLocks((prev) => {
            const next = new Set(prev);
            if (next.has(slot)) next.delete(slot); else next.add(slot);
            return next;
        });
    };

    const onSettle = (slot: SlotId) => (index: number) => {
        const id = options[slot][index]?.id ?? null;
        setSlots((s) => (s[slot] === id ? s : { ...s, [slot]: id }));
    };

    const items = itemsFromSlots(slots, clothes);
    const valid = isValidOutfit(items);
    const bottomIsDress = isDress(items.find((i) => i.id === slots.bottom));
    const matched = looks.find((l) => outfitKey(l.items.map((i) => i.id)) === outfitKey(items.map((i) => i.id)));
    const weatherScore = weather && items.length ? computeWeatherMatch(items, weather.temperature) : null;
    const rotationScore = items.length ? computeWearScore(items, clothes) : null;

    let why: string;
    if (!valid) {
        why = !slots.bottom ? 'Pick a bottom or a dress to finish the look.' : 'Add a top or a layer, or try a dress.';
    } else if (matched) {
        why = matched.explanation || 'Your stylist picked this one for today.';
    } else if (looksLoading && !touched.current) {
        // The AI weather cheer is a nice thing to read while the stylist works.
        why = cheer || stylistLoadingLine(mood.name, weather);
    } else {
        why = mixNote({ items, weather, moodId: mood.id, tryItItemIds, dustyDays });
    }
    const badge = matched ? (matched.isFallback ? 'Quick pick' : 'AI pick') : 'Your mix';

    // Cold-start + growth nudges (unchanged rules from the previous Home).
    const completeness = getWardrobeCompleteness(clothes);
    const missingCategories: ClothingCategory[] = [];
    if (!readiness.hasTopLayer) missingCategories.push(ClothingCategory.Tops, ClothingCategory.Outerwear);
    if (!readiness.hasBottom) missingCategories.push(ClothingCategory.Bottoms);
    const openPicker = (categories?: ClothingCategory[]) =>
        window.dispatchEvent(new CustomEvent('open-starter-picker', {
            detail: categories && categories.length > 0 ? { categories } : undefined,
        }));
    const openScanner = () => window.dispatchEvent(new CustomEvent('open-scanner'));

    const reelSlots = SLOT_ORDER.filter((s) => options[s].length > 0);

    return (
        <div className="space-y-4 pb-6">
            <PageHeader
                title="Today"
                eyebrow={
                    <button
                        type="button"
                        onClick={() => setShowWeather((v) => !v)}
                        aria-expanded={showWeather}
                        className="inline-flex flex-wrap items-center gap-1 text-left hover:text-ink"
                    >
                        {format(new Date(), 'EEE d MMM')} ·
                        <WeatherIcon condition={weather?.condition} />
                        <span>{weather ? `${Math.round(weather.temperature)}° ${weather.condition}` : weatherLoading ? 'Checking the sky…' : 'No weather right now'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 flex-none transition-transform ${showWeather ? 'rotate-180' : ''}`} />
                    </button>
                }
            >
                {showWeather && (
                    <div className="p-3 rounded-2xl bg-white border-[1.5px] border-ink animate-fade-in-up">
                        {weather?.location && <p className="text-[11px] font-extrabold uppercase tracking-wide text-ink/50 mb-2">{weather.location}</p>}
                        {outlook.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {outlook.map((slot) => (
                                    <div key={slot.label} className="rounded-xl bg-paper px-2 py-1.5 text-center">
                                        <p className="text-[10px] font-extrabold uppercase tracking-wide text-ink/50">{slot.label}</p>
                                        <p className="text-sm font-bold text-ink">{slot.temperature}°</p>
                                        <p className="text-[11px] text-ink/60 leading-tight">{slot.condition}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {cheer && <p className="text-sm text-ink/70 leading-relaxed mt-2">{cheer}</p>}
                        {usingDefaultLocation && (
                            <button
                                type="button"
                                onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
                                className="mt-2 text-[11px] font-semibold text-ink underline underline-offset-2"
                            >
                                Location is off. Set your city for local weather.
                            </button>
                        )}
                    </div>
                )}
            </PageHeader>

            <MoodChips value={mood.id} onChange={changeMood} />

            {!readiness.canMakeOutfit ? (
                <section className="rounded-[28px] border-2 border-dashed border-ink/40 p-5">
                    <h2 className="font-display text-xl font-extrabold text-ink">
                        {clothes.length === 0 ? 'Your rails are empty' : 'Almost ready to spin'}
                    </h2>
                    <p className="text-sm text-ink/60 mt-1 mb-4">
                        {clothes.length === 0
                            ? 'Pick a few basics or snap your closet. One photo can catch several pieces.'
                            : `Add ${readiness.missingForOutfit.join(' and ')} and we can start building outfits.`}
                    </p>
                    <div className="flex flex-col gap-2.5">
                        <button type="button" onClick={() => openPicker(clothes.length > 0 ? missingCategories : undefined)} className="h-12 rounded-full bg-ink text-paper font-bold text-sm active:scale-[0.97]">
                            Pick my basics
                        </button>
                        <button type="button" onClick={openScanner} className="h-12 rounded-full border-[1.5px] border-ink text-ink font-bold text-sm active:scale-[0.97]">
                            Scan my items
                        </button>
                    </div>
                </section>
            ) : (
                <>
                    {/* Reels, with the lime "fitting column" behind the centre */}
                    <section className="relative -mx-4 px-4" aria-label="Outfit rails">
                        {/* The "fitting spot": white so garment colours stay true (photos blend onto it) */}
                        <div className="absolute left-1/2 -translate-x-1/2 -top-1 -bottom-1 rounded-[30px] bg-white border-2 border-ink shadow-[0_0_0_5px_#D4F06A]" style={{ width: spotWidth }} aria-hidden="true" />
                        <div key={`${optionsKey}#${reelVersion}#${compact ? "c" : "r"}`} className="relative space-y-0.5">
                            {reelSlots.map((slot) => (
                                <HangerReel
                                    key={slot}
                                    shelf={slot === 'shoes'}
                                    ref={(h) => { reelRefs.current[slot] = h; }}
                                    label={slot === 'bottom' && options.bottom.some(isDress) ? 'Bottom·Dress' : REEL[slot].label}
                                    spotWidth={spotWidth}
                                    options={options[slot]}
                                    initialIndex={indexFor(slot)}
                                    onSettle={onSettle(slot)}
                                    onInteract={markTouched}
                                    locked={locks.has(slot)}
                                    onToggleLock={() => toggleLock(slot)}
                                    dimmed={slot === 'top' && bottomIsDress}
                                    noneLabel={REEL[slot].none}
                                    dustyDays={dustyDays}
                                    size={sizeFor(slot)}
                                />
                            ))}
                        </div>
                    </section>

                    {/* Scores in one line, then the stylist's note at full width */}
                    <section>
                        <div className="flex items-center gap-3">
                            <span className={`flex-none text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full ${matched ? 'bg-ink text-lime' : 'bg-ink/10 text-ink'}`}>{badge}</span>
                            {[
                                { label: 'Weather', value: weatherScore },
                                { label: 'Rotation', value: rotationScore },
                            ].map((m) => (
                                <div key={m.label} className="flex-1 min-w-0">
                                    <div className="flex justify-between text-[10px] font-extrabold uppercase">
                                        <span>{m.label}</span><span>{m.value ?? '…'}</span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden">
                                        <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${m.value ?? 0}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-[14px] leading-snug font-semibold text-ink mt-2">{why}</p>
                    </section>

                    {/* Actions: pinned above the nav so they stay in thumb reach on any screen height */}
                    <section
                        className="sticky z-30 -mx-4 px-4 py-2 flex items-center gap-3 bg-paper/95 backdrop-blur-sm"
                        style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
                    >
                        <button
                            type="button"
                            onClick={() => { if (weather && valid) { touched.current = true; setSavedText(wearSavedLine({ items, weather, moodId: mood.id, dustyDays })); wear(items.map((i) => i.id), mood.id, weather); } }}
                            disabled={!weather || !valid || isPending}
                            className={`flex-1 ${compact ? 'h-12' : 'h-[56px]'} rounded-full bg-ink text-paper font-extrabold text-[15px] active:scale-[0.98] disabled:opacity-50`}
                        >
                            {isPending ? 'Saving…' : logged ? 'Saved ✓' : 'Wear this'}
                        </button>
                        <button
                            type="button"
                            onClick={spin}
                            aria-label="Spin: let your stylist fill the unlocked rails"
                            className={`${compact ? 'w-14 h-14' : 'w-[64px] h-[64px]'} flex-none rounded-full bg-lime border-2 border-ink text-ink flex flex-col items-center justify-center text-[11px] font-extrabold transition-transform duration-700 ease-out active:scale-95`}
                            style={{ transform: `rotate(${spinTurns * 360}deg)` }}
                        >
                            <Dices className="w-[22px] h-[22px]" />
                            SPIN
                        </button>
                    </section>
                </>
            )}

            {readiness.canMakeOutfit && completeness.nextUnlock && (
                <section className="rounded-[22px] bg-white border-[1.5px] border-ink p-4">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="text-sm font-extrabold text-ink">{clothes.length < 5 ? 'Start with five pieces' : completeness.stage}</h2>
                        <span className="text-xs font-bold text-ink/60">{clothes.length < 5 ? `${clothes.length}/5` : `${Math.round(completeness.ratio * 100)}%`}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden mt-2">
                        <div className="h-full bg-ink" style={{ width: `${clothes.length < 5 ? (clothes.length / 5) * 100 : completeness.ratio * 100}%` }} />
                    </div>
                    <p className="text-xs text-ink/60 mt-2">{clothes.length < 5 ? 'More pieces, more fun spins.' : `${completeness.nextUnlock}.`}</p>
                    <div className="flex gap-2 mt-3">
                        <button type="button" onClick={() => openPicker(completeness.nextUnlockKey === 'shoes' ? [ClothingCategory.Shoes] : undefined)} className="flex-1 h-10 rounded-full bg-ink text-paper text-xs font-bold">
                            Pick basics
                        </button>
                        <button type="button" onClick={openScanner} className="flex-1 h-10 rounded-full border-[1.5px] border-ink text-ink text-xs font-bold">
                            Scan an item
                        </button>
                    </div>
                </section>
            )}

            <StreakCard />

            <WearToast isPending={isPending} logged={logged} onUndo={undo} savedText={savedText} />
        </div>
    );
};

export default Home;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Dices, X } from 'lucide-react';
import { useWardrobe } from '../../context/WardrobeContext';
import { computeSeasonalLeastWornIds, computeWearScore, computeWeatherMatch } from '../../services/agents/agentOutputGuards';
import { useMood } from '../../hooks/useMood';
import { useTodayWeather } from '../../hooks/useTodayWeather';
import { useStylistLooks } from '../../hooks/useStylistLooks';
import { usePendingWear } from '../../hooks/usePendingWear';
import { useShortScreen } from '../../hooks/useShortScreen';
import { HangerReel, type HangerReelHandle } from './HangerReel';
import { WearToast } from '../common/WearToast';
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
} from '../../utils/outfitSlots';
import { haptic } from '../../utils/motion';
import { loggedKeysOn, outfitKey } from '../../utils/wearLog';
import { mixNote, stylistLoadingLine, wearSavedLine } from '../../copy/voice';

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

export interface BuilderSeed {
    /** A whole look to start from (a stylist look the user wants to tweak). */
    slots?: OutfitSlots;
    /** One piece to build around; it arrives locked so Spin keeps it. */
    lockItemId?: string;
}

interface OutfitBuilderProps {
    seed: BuilderSeed | null;
    /** Log the outfit for this past day instead of today. */
    logDate?: Date | null;
    onBack: () => void;
    /** Called once a past-day outfit has been saved. */
    onPastDayLogged?: () => void;
}

/**
 * Tweak mode on Today: one hanger rail per slot (layer / top / bottom / shoes). Lock the pieces you
 * love and tap Spin: the rails land on the stylist's looks (shared session batch), then on
 * code-assembled combinations once the batch is used up.
 */
export const OutfitBuilder: React.FC<OutfitBuilderProps> = ({ seed, logDate = null, onBack, onPastDayLogged }) => {
    const { clothes, outfits, tryItItemIds } = useWardrobe();
    const [mood] = useMood();
    const { weather, cheer } = useTodayWeather();
    const { looks, isLoading: looksLoading } = useStylistLooks(mood, weather);
    const { wear, undo, isPending, logged, notice } = usePendingWear();
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

    const lockItem = seed?.lockItemId ? clothes.find((c) => c.id === seed.lockItemId) ?? null : null;
    const lockSlot = lockItem ? slotForItem(lockItem) : null;
    const incoming = seed?.slots
        ?? (lockItem && lockSlot ? assembleCodeSlots(options, { [lockSlot]: lockItem.id }, priorityIds, weather?.temperature ?? null, 0) : null);
    const touched = useRef(Boolean(incoming));
    const autoLanded = useRef(false);
    const spinState = useRef({ cursor: 0, used: 0, seed: 1 });
    const reelRefs = useRef<Partial<Record<SlotId, HangerReelHandle | null>>>({});
    const [slots, setSlots] = useState<OutfitSlots>(incoming ?? EMPTY_SLOTS);
    const [locks, setLocks] = useState<Set<SlotId>>(() => new Set(lockSlot ? [lockSlot] : []));
    const [spinTurns, setSpinTurns] = useState(0);
    const [savedText, setSavedText] = useState<string | undefined>();
    const [reelVersion, setReelVersion] = useState(0);
    const initialized = useRef(Boolean(incoming));

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

    // A new mood hands the rails back to the stylist: they spin onto that mood's first look.
    const moodRef = useRef(mood.id);
    useEffect(() => {
        if (moodRef.current === mood.id) return;
        moodRef.current = mood.id;
        touched.current = false;
        autoLanded.current = false;
    }, [mood.id]);

    // Until the user takes over, the rails show the best available look: a code-assembled one
    // straight away, then they spin onto the stylist's first pick as soon as it arrives.
    useEffect(() => {
        if (touched.current || clothes.length === 0) return;
        // A past day isn't about today's weather: no landing on today's AI pick.
        if (looks.length > 0 && !autoLanded.current && !logDate) {
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

    // A past-day log is done once it's saved: hand back to the caller.
    useEffect(() => {
        if (logged && logDate) onPastDayLogged?.();
    }, [logged, logDate, onPastDayLogged]);

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
    const itemIds = items.map((i) => i.id);
    const valid = isValidOutfit(items);
    const bottomIsDress = isDress(items.find((i) => i.id === slots.bottom));
    const matched = looks.find((l) => outfitKey(l.items.map((i) => i.id)) === outfitKey(itemIds));
    const weatherScore = weather && items.length ? computeWeatherMatch(items, weather.temperature) : null;
    const rotationScore = items.length ? computeWearScore(items, clothes) : null;
    const dayKeys = loggedKeysOn(outfits, logDate ?? new Date());
    const alreadyWorn = dayKeys.has(outfitKey(itemIds));
    const dayLabel = logDate ? format(logDate, 'EEE d MMM') : null;

    let why: string;
    if (!valid) {
        why = !slots.bottom ? 'Pick a bottom or a dress to finish the look.' : 'Add a top or a layer, or try a dress.';
    } else if (logDate) {
        why = `Line up what you wore on ${dayLabel}, then log it.`;
    } else if (matched) {
        why = matched.explanation || 'Your stylist picked this one for today.';
    } else if (looksLoading && !touched.current) {
        // The AI weather cheer is a nice thing to read while the stylist works.
        why = cheer || stylistLoadingLine(mood.name, weather);
    } else {
        why = mixNote({ items, weather, moodId: mood.id, tryItItemIds, dustyDays });
    }
    const badge = matched ? (matched.isFallback ? 'Quick pick' : 'AI pick') : 'Your mix';

    const onWear = () => {
        if (!valid || alreadyWorn) return;
        touched.current = true;
        setSavedText(logDate ? `Logged for ${dayLabel}.` : wearSavedLine({ items, weather, moodId: mood.id, dustyDays }));
        // A past day has no forecast to attach.
        wear(itemIds, mood.id, logDate ? null : weather, logDate ?? undefined);
    };

    const wearLabel = isPending ? 'Saving…'
        : logged ? 'Saved ✓'
        : alreadyWorn ? (logDate ? 'Logged ✓' : 'Worn today ✓')
        : logDate ? `Log for ${dayLabel}`
        : dayKeys.size > 0 ? 'Also wore this' : 'Wear this';

    const reelSlots = SLOT_ORDER.filter((s) => options[s].length > 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 h-9 pl-2 pr-3.5 rounded-full border-[1.5px] border-ink text-xs font-bold">
                    {logDate ? <X className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
                    {logDate ? 'Cancel' : 'Back to looks'}
                </button>
                {logDate && (
                    <span className="h-9 px-3.5 inline-flex items-center rounded-full bg-lime border-[1.5px] border-ink text-xs font-extrabold">
                        Logging {dayLabel}
                    </span>
                )}
            </div>

            {/* Rails, with the white "fitting spot" behind the centre */}
            <section className="relative -mx-4 px-4" aria-label="Outfit rails">
                <div className="absolute left-1/2 -translate-x-1/2 -top-1 -bottom-1 rounded-[30px] bg-white border-2 border-ink shadow-[0_0_0_5px_#D4F06A]" style={{ width: spotWidth }} aria-hidden="true" />
                <div key={`${optionsKey}#${reelVersion}#${compact ? 'c' : 'r'}`} className="relative space-y-0.5">
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
                {!logDate && (
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
                )}
                <p className="text-[14px] leading-snug font-semibold text-ink mt-2">{why}</p>
            </section>

            {/* Actions: pinned above the nav so they stay in thumb reach on any screen height */}
            <section
                className="sticky z-30 -mx-4 px-4 py-2 flex items-center gap-3 bg-paper/95 backdrop-blur-sm"
                style={{ bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))' }}
            >
                <button
                    type="button"
                    onClick={onWear}
                    disabled={!valid || isPending || alreadyWorn}
                    className={`flex-1 ${compact ? 'h-12' : 'h-[56px]'} rounded-full bg-ink text-paper font-extrabold text-[15px] active:scale-[0.98] disabled:opacity-50`}
                >
                    {wearLabel}
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

            <WearToast isPending={isPending} logged={logged} notice={notice} onUndo={undo} savedText={savedText} />
        </div>
    );
};

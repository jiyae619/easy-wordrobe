import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Cloud, CloudRain, Sun, Wind, ChevronDown } from 'lucide-react';
import { useWardrobe } from '../context/WardrobeContext';
import { ClothingCategory } from '../types';
import { getWardrobeReadiness } from '../services/agents/agentOutputGuards';
import { useMood } from '../hooks/useMood';
import { useTodayWeather } from '../hooks/useTodayWeather';
import { MoodChips } from '../components/common/MoodChips';
import { PageHeader } from '../components/common/PageHeader';
import { StreakCard } from '../components/home/StreakCard';
import { FirstWeekChecklist } from '../components/home/FirstWeekChecklist';
import { LooksDeck } from '../components/today/LooksDeck';
import { OutfitBuilder, type BuilderSeed } from '../components/today/OutfitBuilder';
import type { OutfitSlots } from '../utils/outfitSlots';

const WeatherIcon: React.FC<{ condition?: string }> = ({ condition = '' }) => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain className="w-4 h-4" />;
    if (c.includes('cloud')) return <Cloud className="w-4 h-4" />;
    if (c.includes('wind')) return <Wind className="w-4 h-4" />;
    return <Sun className="w-4 h-4" />;
};

/** Router hand-offs into Today: a piece to build around (Closet, Stats, scanner) or a past day to log. */
export interface TodayRouteState {
    lockItemId?: string;
    slots?: OutfitSlots;
    /** ISO date of a past day to log an outfit for. */
    logDate?: string;
}

interface BuildMode {
    seed: BuilderSeed | null;
    logDate: Date | null;
    /** Remounts the builder for every new hand-off so it starts from that seed. */
    key: number;
}

/**
 * Today — the stylist. The 3 AI looks for the mood and weather as swipe cards; "Tweak" opens the
 * hanger-rail builder (lock + Spin) on the same batch. Also where a past day gets logged.
 */
const Today: React.FC = () => {
    const { clothes } = useWardrobe();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [mood, setMood] = useMood();
    const { weather, outlook, cheer, isLoading: weatherLoading, usingDefaultLocation } = useTodayWeather();
    const readiness = getWardrobeReadiness(clothes);
    const [showWeather, setShowWeather] = useState(false);

    const routeState = location.state as TodayRouteState | null;
    const hasHandoff = Boolean(routeState && (routeState.lockItemId || routeState.slots || routeState.logDate));
    const [build, setBuild] = useState<BuildMode | null>(null);
    const [handledKey, setHandledKey] = useState<string | null>(null);

    // A hand-off (Closet / Stats "Style it", a past day to log) opens the builder from that seed.
    // Adjusted during render so the builder mounts with it straight away.
    if (hasHandoff && routeState && handledKey !== location.key) {
        setHandledKey(location.key);
        setBuild((b) => ({
            seed: { lockItemId: routeState.lockItemId, slots: routeState.slots },
            logDate: routeState.logDate ? new Date(routeState.logDate) : null,
            key: (b?.key ?? 0) + 1,
        }));
    }

    // Router hand-offs are consumed once.
    useEffect(() => {
        if (routeState) navigate(location.pathname + location.search, { replace: true, state: null });
    }, [routeState, navigate, location.pathname, location.search]);

    // Deep links like /?mood=romantic still work.
    const moodParam = searchParams.get('mood');
    useEffect(() => {
        if (moodParam) setMood(moodParam);
    }, [moodParam, setMood]);

    const openBuilder = (slots?: OutfitSlots) =>
        setBuild((b) => ({ seed: slots ? { slots } : null, logDate: null, key: (b?.key ?? 0) + 1 }));
    const closeBuilder = useCallback(() => setBuild(null), []);
    const pastDayLogged = useCallback(() => navigate('/insights'), [navigate]);

    const missingCategories: ClothingCategory[] = [];
    if (!readiness.hasTopLayer) missingCategories.push(ClothingCategory.Tops, ClothingCategory.Outerwear);
    if (!readiness.hasBottom) missingCategories.push(ClothingCategory.Bottoms);
    const openPicker = (categories?: ClothingCategory[]) =>
        window.dispatchEvent(new CustomEvent('open-starter-picker', {
            detail: categories && categories.length > 0 ? { categories } : undefined,
        }));
    const openScanner = () => window.dispatchEvent(new CustomEvent('open-scanner'));

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

            {!build?.logDate && <MoodChips value={mood.id} onChange={setMood} />}

            {!readiness.canMakeOutfit ? (
                <section className="rounded-[28px] border-2 border-dashed border-ink/40 p-5">
                    <h2 className="font-display text-xl font-extrabold text-ink">
                        {clothes.length === 0 ? 'Your closet is empty' : 'Almost ready'}
                    </h2>
                    <p className="text-sm text-ink/60 mt-1 mb-4">
                        {clothes.length === 0
                            ? 'Pick a few basics or snap your closet. One photo can catch several pieces.'
                            : `Add ${readiness.missingForOutfit.join(' and ')} and your stylist can start.`}
                    </p>
                    <div className="flex flex-col gap-2.5">
                        <button type="button" onClick={() => openPicker(clothes.length > 0 ? missingCategories : undefined)} className="h-12 rounded-full bg-ink text-paper font-bold text-sm active:scale-[0.97]">
                            Pick my basics
                        </button>
                        <button type="button" onClick={openScanner} className="h-12 rounded-full border-[1.5px] border-ink text-ink font-bold text-sm active:scale-[0.97]">
                            Scan my clothes
                        </button>
                    </div>
                </section>
            ) : build ? (
                <OutfitBuilder
                    key={build.key}
                    seed={build.seed}
                    logDate={build.logDate}
                    onBack={closeBuilder}
                    onPastDayLogged={pastDayLogged}
                />
            ) : (
                <LooksDeck onTweak={openBuilder} />
            )}

            {!build?.logDate && <FirstWeekChecklist />}
            {!build?.logDate && <StreakCard />}
        </div>
    );
};

export default Today;

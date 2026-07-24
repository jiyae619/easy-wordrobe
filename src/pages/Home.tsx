import React, { useState, useEffect } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import { Cloud, Sun, CloudRain, Wind, Sparkles, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { awsNovaService } from '../services/awsNova';
import { weatherService } from '../services/weatherService';
import { ClothingCategory, type OutfitSuggestion, type WeatherData, type WeatherOutlookPeriod } from '../types';
import { MOODS } from '../data/moods';
import { getWardrobeReadiness, getWardrobeCompleteness } from '../services/agents/agentOutputGuards';
import { StreakCard } from '../components/home/StreakCard';
import { ExpandableText } from '../components/common/ExpandableText';

const WEATHER_CACHE_KEY = 'home-weather-cache-v1';

const Home: React.FC = () => {
    const { clothes, logOutfitWear, userSettings } = useWardrobe();
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [weatherOutlook, setWeatherOutlook] = useState<WeatherOutlookPeriod[]>([]);
    const [weatherCheer, setWeatherCheer] = useState('');
    const [quickOutfit, setQuickOutfit] = useState<OutfitSuggestion | null>(null);
    const [outfitLoading, setOutfitLoading] = useState(false);
    const [isWeatherLoading, setIsWeatherLoading] = useState(true);
    const [isLoggingQuickPick, setIsLoggingQuickPick] = useState(false);
    const [quickPickLogged, setQuickPickLogged] = useState(false);
    const [usingDefaultLocation, setUsingDefaultLocation] = useState(false);

    const wardrobeSignature = clothes
        .map((item) => {
            const lastWornMs = item.lastWorn ? new Date(item.lastWorn).getTime() : 0;
            const seasons = [...item.season].sort().join(',');
            return `${item.id}:${item.wearFrequency}:${lastWornMs}:${seasons}`;
        })
        .sort()
        .join('|');

    const buildQuickPickCacheKey = (wardrobeKey: string, conditionText: string, tempC: number) =>
        `quick-pick:v2:${wardrobeKey}:${conditionText.toLowerCase()}:${Math.round(tempC)}`;

    const fetchQuickOutfit = async (weatherData: WeatherData, useCache = true) => {
        if (clothes.length === 0) {
            setQuickOutfit(null);
            return;
        }

        setOutfitLoading(true);
        try {
            const cacheKey = buildQuickPickCacheKey(
                wardrobeSignature,
                weatherData.condition,
                weatherData.temperature
            );
            const cached = useCache ? sessionStorage.getItem(cacheKey) : null;

            if (cached) {
                setQuickOutfit(JSON.parse(cached) as OutfitSuggestion);
                return;
            }

            const casualMood = MOODS.find(m => m.id === 'casual') || MOODS[1];
            const outfits = await awsNovaService.suggestOutfits(clothes, casualMood, weatherData);
            if (outfits.length > 0) {
                setQuickOutfit(outfits[0]);
                sessionStorage.setItem(cacheKey, JSON.stringify(outfits[0]));
            } else {
                setQuickOutfit(null);
            }
        } finally {
            setOutfitLoading(false);
        }
    };

    // Time-based greeting
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    // Weather icon helper
    const getWeatherIcon = () => {
        if (!weather) return <Sun className="w-6 h-6 text-olive-600" />;
        const condition = weather.condition.toLowerCase();
        if (condition.includes('rain')) return <CloudRain className="w-6 h-6 text-olive-600" />;
        if (condition.includes('cloud')) return <Cloud className="w-6 h-6 text-olive-600" />;
        if (condition.includes('wind')) return <Wind className="w-6 h-6 text-olive-600" />;
        return <Sun className="w-6 h-6 text-olive-600" />;
    };

    // Fetch weather + quick outfit on mount
    useEffect(() => {
        const cached = sessionStorage.getItem(WEATHER_CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached) as {
                    weather: WeatherData;
                    weatherOutlook: WeatherOutlookPeriod[];
                    weatherCheer: string;
                };
                setWeather(parsed.weather);
                setWeatherOutlook(parsed.weatherOutlook || []);
                setWeatherCheer(parsed.weatherCheer || '');
            } catch {
                sessionStorage.removeItem(WEATHER_CACHE_KEY);
            }
        }

        const loadData = async () => {
            try {
                // Request geolocation consent and fetch weather by coords
                let weatherData: WeatherData;
                let outlookData: WeatherOutlookPeriod[];
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
                    });
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;
                    const [current, outlook] = await Promise.all([
                        weatherService.getCurrentWeather(lat, lon),
                        weatherService.getWeatherOutlook(lat, lon),
                    ]);
                    weatherData = current;
                    outlookData = outlook;
                    setUsingDefaultLocation(false);
                } catch {
                    // Location denied/unavailable — use the user's chosen city, else the default.
                    const fallbackCity = userSettings?.city || 'San Francisco';
                    const [current, outlook] = await Promise.all([
                        weatherService.getWeatherByCity(fallbackCity),
                        weatherService.getWeatherOutlookByCity(fallbackCity),
                    ]);
                    weatherData = current;
                    outlookData = outlook;
                    setUsingDefaultLocation(!userSettings?.city);
                }
                setWeather(weatherData);
                setWeatherOutlook(outlookData);

                const cheer = await awsNovaService.generateWeatherCheer(weatherData, outlookData);
                const finalCheer = cheer || `The ${weatherData.condition.toLowerCase()} vibes are here. You have this today.`;
                setWeatherCheer(finalCheer);

                sessionStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
                    weather: weatherData,
                    weatherOutlook: outlookData,
                    weatherCheer: finalCheer,
                }));

                await fetchQuickOutfit(weatherData, true);
            } catch (err) {
                console.error("Home data load error:", err);
                setOutfitLoading(false);
            } finally {
                setIsWeatherLoading(false);
            }
        };
        loadData();
    }, [wardrobeSignature, userSettings?.city]);

    const temp = weather?.temperature;
    const condition = weather?.condition;
    const location = weather?.location;
    const starterTarget = 5;
    const starterCount = Math.min(clothes.length, starterTarget);
    const starterProgress = Math.round((starterCount / starterTarget) * 100);
    const readiness = getWardrobeReadiness(clothes);
    const completeness = getWardrobeCompleteness(clothes);
    const completenessPct = Math.round(completeness.ratio * 100);

    // Categories the picker should deep-link to when the closet can't yet make a full outfit.
    const missingCategories: ClothingCategory[] = [];
    if (!readiness.hasTopLayer) missingCategories.push(ClothingCategory.Tops, ClothingCategory.Outerwear);
    if (!readiness.hasBottom) missingCategories.push(ClothingCategory.Bottoms);

    const openPicker = (categories?: ClothingCategory[]) =>
        window.dispatchEvent(new CustomEvent('open-starter-picker', {
            detail: categories && categories.length > 0 ? { categories } : undefined,
        }));
    const openScanner = () => window.dispatchEvent(new CustomEvent('open-scanner'));

    // Weather outlook tiles (real data, else 3 loading placeholders).
    const outlookTiles: Array<{ label: string; temperature: number | null; condition: string }> =
        weatherOutlook.length > 0
            ? weatherOutlook
            : [
                { label: 'morning', temperature: null, condition: 'Loading' },
                { label: 'daytime', temperature: null, condition: 'Loading' },
                { label: 'evening', temperature: null, condition: 'Loading' },
            ];

    return (
        <div className="space-y-6 pb-20">
            {/* Greeting */}
            <section>
                <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                    {getGreeting()} 👋
                </h1>
            </section>

            {/* TODAY — weather and today's look fused into one surface */}
            <section>
                <div className="rounded-2xl overflow-hidden border border-olive-200/60 shadow-sm">
                    {/* Weather header */}
                    <div className="bg-gradient-to-br from-olive-100/80 to-olive-50 p-5">
                        <div className="flex items-center gap-2.5">
                            {getWeatherIcon()}
                            <div className="min-w-0">
                                <p className="text-lg font-medium tracking-tight text-primary leading-tight">
                                    {temp != null && condition ? `${temp}°C · ${condition}` : 'Loading local weather'}
                                </p>
                                <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary truncate">
                                    {location || 'Locating city'}
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                            {outlookTiles.map((slot) => (
                                <div key={slot.label} className="rounded-xl bg-white/70 border border-olive-200/70 px-2 py-2 text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-olive-500">{slot.label}</p>
                                    <p className="text-sm font-semibold text-primary">{slot.temperature != null ? `${slot.temperature}°C` : '--'}</p>
                                    <p className="text-[11px] text-olive-600 line-clamp-1">{slot.condition}</p>
                                </div>
                            ))}
                        </div>
                        {usingDefaultLocation && (
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent('open-settings'))}
                                className="mt-2 text-[11px] font-semibold text-secondary underline underline-offset-2 hover:text-primary"
                            >
                                Location off — set your city for local weather
                            </button>
                        )}
                        {(weatherCheer || isWeatherLoading) && (
                            <p className="text-sm text-olive-700 leading-relaxed mt-3">
                                {weatherCheer || 'Getting today\'s weather mood'}
                            </p>
                        )}
                    </div>

                    {/* Body — today's look, or the cold-start prompt when we can't build an outfit yet */}
                    <div className="bg-white border-t border-olive-100 p-5">
                        {!readiness.canMakeOutfit ? (
                            <div>
                                <h2 className="text-base font-bold text-primary">
                                    {clothes.length === 0 ? 'Start your closet' : 'Almost ready to style you'}
                                </h2>
                                <p className="text-sm text-olive-600 mt-1 mb-4">
                                    {clothes.length === 0
                                        ? 'Pick your basics from our catalog, or snap your closet — one shelf photo can capture several pieces.'
                                        : `Add ${readiness.missingForOutfit.join(' and ')} so we can build full outfits from your closet.`}
                                </p>
                                <div className="flex flex-col gap-2 sm:flex-row">
                                    <button
                                        onClick={() => openPicker(clothes.length > 0 ? missingCategories : undefined)}
                                        className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-olive-700 transition-colors active:scale-[0.97]"
                                    >
                                        Pick my basics
                                    </button>
                                    <button
                                        onClick={openScanner}
                                        className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-white border border-olive-200 text-secondary rounded-xl font-semibold hover:bg-olive-50 transition-colors active:scale-[0.97]"
                                    >
                                        Scan my items
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-base font-bold text-primary">Today's look</h2>
                                    <Link to="/suggest" className="text-xs font-semibold text-secondary hover:underline">
                                        See more
                                    </Link>
                                </div>

                                {outfitLoading && (
                                    <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in-up">
                                        <div className="p-3 bg-olive-100 rounded-full mb-3">
                                            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
                                        </div>
                                        <p className="text-sm text-olive-500">Finding a look for today's weather...</p>
                                    </div>
                                )}

                                {!outfitLoading && quickOutfit && (
                                    <div className="animate-fade-in-up">
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {quickOutfit.items.slice(0, 3).map((item, i) => (
                                                <div key={i} className="relative rounded-xl overflow-hidden bg-olive-50 aspect-square">
                                                    {item.imageUrl ? (
                                                        <img
                                                            src={item.imageUrl}
                                                            alt={item.subcategory}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex items-center justify-center h-full">
                                                            <Sparkles className="w-6 h-6 text-olive-300" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        {quickOutfit.explanation && (
                                            <ExpandableText
                                                text={quickOutfit.explanation}
                                                textClassName="text-sm text-olive-600 leading-relaxed mt-3"
                                                collapsedClassName="line-clamp-2"
                                            />
                                        )}

                                        <div className="mt-4 flex items-center gap-3">
                                            <button
                                                onClick={async () => {
                                                    if (!weather || !quickOutfit || isLoggingQuickPick) return;
                                                    setIsLoggingQuickPick(true);
                                                    await logOutfitWear(
                                                        quickOutfit.items.map(item => item.id),
                                                        'casual',
                                                        weather
                                                    );
                                                    setIsLoggingQuickPick(false);
                                                    setQuickPickLogged(true);
                                                    window.setTimeout(() => setQuickPickLogged(false), 2000);
                                                }}
                                                disabled={!weather || isLoggingQuickPick}
                                                className="flex-1 bg-primary hover:bg-olive-700 text-white font-bold py-3 rounded-xl transition-colors active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                {isLoggingQuickPick ? 'Logging...' : 'Wear it'}
                                            </button>
                                            <Link
                                                to="/suggest"
                                                className="flex-1 bg-olive-100 hover:bg-olive-200 text-secondary font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-[0.97]"
                                            >
                                                <Sparkles className="w-4 h-4" />
                                                See More
                                            </Link>
                                        </div>
                                    </div>
                                )}

                                {!outfitLoading && !quickOutfit && (
                                    <div className="text-center py-6 animate-fade-in-up">
                                        <p className="text-sm text-olive-500">Couldn't generate a suggestion right now.</p>
                                        <div className="mt-3 flex items-center justify-center gap-3">
                                            <button
                                                onClick={() => {
                                                    if (weather) {
                                                        void fetchQuickOutfit(weather, false);
                                                    }
                                                }}
                                                className="inline-flex items-center px-5 py-2.5 bg-olive-100 text-secondary rounded-full font-medium hover:bg-olive-200 transition-colors active:scale-[0.97]"
                                            >
                                                Try Again
                                            </button>
                                            <Link
                                                to="/suggest"
                                                className="inline-flex items-center px-5 py-2.5 bg-primary text-white rounded-full font-medium hover:bg-olive-700 transition-colors active:scale-[0.97]"
                                            >
                                                <Sparkles className="w-4 h-4 mr-2" />
                                                Open Suggest
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* Secondary tier — streak + keep-building progress (only once the closet can style you) */}
            <StreakCard />

            {readiness.canMakeOutfit && clothes.length < starterTarget && (
                <section>
                    <div className="rounded-2xl border border-olive-200/70 bg-white p-5">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <h2 className="text-base font-bold text-primary">Build your 5-item starter closet</h2>
                            <span className="text-xs font-semibold text-secondary">
                                {starterCount}/{starterTarget}
                            </span>
                        </div>
                        <div className="h-2 rounded-full bg-olive-100 overflow-hidden mb-3">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${starterProgress}%` }}
                            />
                        </div>
                        <p className="text-sm text-olive-600 mb-4">
                            Add a few more basics to unlock sharper suggestions.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                onClick={() => openPicker()}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-olive-700 transition-colors active:scale-[0.97]"
                            >
                                Pick my basics
                            </button>
                            <button
                                onClick={openScanner}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-white border border-olive-200 text-secondary rounded-xl font-semibold hover:bg-olive-50 transition-colors active:scale-[0.97]"
                            >
                                Scan my items
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {readiness.canMakeOutfit && clothes.length >= starterTarget && completeness.nextUnlock && (
                <section>
                    <div className="rounded-2xl border border-olive-200/70 bg-white p-5">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <h2 className="text-base font-bold text-primary">{completeness.stage}</h2>
                            <span className="text-xs font-semibold text-secondary">{completenessPct}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-olive-100 overflow-hidden mb-3">
                            <div
                                className="h-full bg-primary transition-all duration-300"
                                style={{ width: `${completenessPct}%` }}
                            />
                        </div>
                        <p className="text-sm text-olive-600 mb-4">{completeness.nextUnlock}.</p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                                onClick={() => openPicker(completeness.nextUnlockKey === 'shoes' ? [ClothingCategory.Shoes] : undefined)}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-olive-700 transition-colors active:scale-[0.97]"
                            >
                                Pick basics
                            </button>
                            <button
                                onClick={openScanner}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-white border border-olive-200 text-secondary rounded-xl font-semibold hover:bg-olive-50 transition-colors active:scale-[0.97]"
                            >
                                Scan an item
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {quickPickLogged && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
                    <div className="flex items-center gap-2 px-5 py-3 bg-primary text-white rounded-full shadow-lg text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Outfit logged!
                    </div>
                </div>
            )}

        </div>
    );
};

export default Home;

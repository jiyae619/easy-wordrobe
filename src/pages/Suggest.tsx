import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import { awsNovaService } from '../services/awsNova';
import { weatherService } from '../services/weatherService';
import { computeDeprioritizedItemIds, computeSeasonalLeastWornIds, describeOutfitReason } from '../services/agents/agentOutputGuards';
import { OutfitCard } from '../components/suggestions/OutfitCard';

import { type OutfitSuggestion, type WeatherData } from '../types';
import { Sparkles, Loader2, RefreshCw, Frown, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

import { MOODS } from '../data/moods';

// Mood icon helper
function getMoodIcon(id: string): string {
    switch (id) {
        case 'professional': return '💼';
        case 'casual': return '☕';
        case 'sporty': return '🏃';
        case 'creative': return '🎨';

        case 'romantic': return '💕';
        default: return '✨';
    }
}

const Suggest: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { clothes, outfits, logOutfitWear, userSettings, tryItItemIds, suggestionEvents, logSuggestionEvent } = useWardrobe();
    const moodId = searchParams.get('mood') || userSettings?.preferredVibe || 'casual';
    const mood = MOODS.find(m => m.id === moodId) || MOODS[1];

    // Stable key that changes only when the SET of items changes (add/remove) — not when a wear is
    // logged (which only bumps wearFrequency/lastWorn). Prevents "Wear it" from regenerating outfits.
    const wardrobeItemsKey = clothes.map(c => c.id).sort().join(',');

    const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [logged, setLogged] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [pendingWear, setPendingWear] = useState<{ suggestionId: string; timerId: number } | null>(null);

    // Touch handling for swipe
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    // Keep the latest logOutfitWear + any pending wear in refs so we can flush on unmount
    // (navigating away must never silently drop a wear the user already confirmed).
    const logWearRef = useRef(logOutfitWear);
    logWearRef.current = logOutfitWear;
    const pendingWearRef = useRef<{ itemIds: string[]; moodId: string; weather: WeatherData; timerId: number } | null>(null);

    const resolveWeather = async (): Promise<WeatherData> => {
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
            });
            return weatherService.getCurrentWeather(
                position.coords.latitude,
                position.coords.longitude
            );
        } catch {
            return weatherService.getWeatherByCity(userSettings?.city || 'San Francisco');
        }
    };

    useEffect(() => {
        const fetchSuggestions = async () => {
            setIsLoading(true);
            setError(null);
            setCurrentIndex(0);

            try {
                const weatherData = await resolveWeather();
                setWeather(weatherData);

                if (clothes.length === 0) {
                    setError('wardrobe_empty');
                    setIsLoading(false);
                    return;
                }

                // Prepare user profile data if available
                const userProfile = userSettings ? {
                    gender: userSettings.gender,
                    height: userSettings.height,
                    weight: userSettings.weight
                } : undefined;

                const behavioralContext = {
                    // Computed deterministically from wear history — always available, no dependency
                    // on the Insights page (BehavioralAgent) having run this session.
                    leastWornItemIds: computeSeasonalLeastWornIds(clothes, outfits),
                    tryItItemIds,
                    deprioritizeItemIds: computeDeprioritizedItemIds(suggestionEvents, clothes),
                };

                const result = await awsNovaService.suggestOutfits(clothes, mood, weatherData, userProfile, behavioralContext);
                setSuggestions(result);
            } catch (err) {
                console.error("Suggestion error:", err);
                setError('Failed to generate suggestions. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSuggestions();
        // Refetch only when the item set or mood changes — NOT when a wear bumps wearFrequency.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wardrobeItemsKey, moodId]);

    const handleRegenerate = async () => {
        if (!weather) return;
        // "Show Different Looks" rejects the outfit currently on screen.
        const current = suggestions[currentIndex];
        if (current) {
            void logSuggestionEvent('regenerated', current.items.map(item => item.id), moodId);
        }
        setIsRegenerating(true);
        try {
            // Prepare user profile data if available
            const userProfile = userSettings ? {
                gender: userSettings.gender,
                height: userSettings.height,
                weight: userSettings.weight
            } : undefined;

            const behavioralContext = {
                leastWornItemIds: computeSeasonalLeastWornIds(clothes, outfits),
                tryItItemIds,
                deprioritizeItemIds: computeDeprioritizedItemIds(suggestionEvents, clothes),
            };

            const newOutfits = await awsNovaService.suggestOutfits(clothes, mood, weather, userProfile, behavioralContext);
            setSuggestions(newOutfits);
            setCurrentIndex(0);
        } catch (err) {
            console.error('Regeneration error:', err);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleWear = (suggestion: OutfitSuggestion) => {
        if (!weather) return;
        if (pendingWearRef.current) {
            window.clearTimeout(pendingWearRef.current.timerId);
        }

        const itemIds = suggestion.items.map(item => item.id);
        const capturedWeather = weather;
        const timerId = window.setTimeout(async () => {
            pendingWearRef.current = null;
            await logOutfitWear(itemIds, moodId, capturedWeather);
            setPendingWear(null);
            setLogged(true);
            window.setTimeout(() => setLogged(false), 2000);
        }, 4000);

        pendingWearRef.current = { itemIds, moodId, weather: capturedWeather, timerId };
        setPendingWear({ suggestionId: suggestion.id, timerId });
    };

    const handleMoodChange = (id: string) => {
        setSearchParams({ mood: id });
    };

    const goToNext = useCallback(() => {
        setCurrentIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    }, [suggestions.length]);

    const goToPrev = useCallback(() => {
        setCurrentIndex(prev => Math.max(prev - 1, 0));
    }, []);

    // "Next Look" (the skip button) is an explicit pass on this outfit — log it, then advance.
    const handleSkip = () => {
        const current = suggestions[currentIndex];
        if (current) {
            void logSuggestionEvent('skipped', current.items.map(item => item.id), moodId);
        }
        goToNext();
    };

    const handleUndoWear = () => {
        if (pendingWearRef.current) {
            window.clearTimeout(pendingWearRef.current.timerId);
            pendingWearRef.current = null;
        }
        setPendingWear(null);
    };

    // Swipe handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50;
        if (diff > threshold) {
            goToNext();
        } else if (diff < -threshold) {
            goToPrev();
        }
    };

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                goToNext();
            } else if (e.key === 'ArrowLeft') {
                goToPrev();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [goToNext, goToPrev]);

    // Flush a still-pending wear on unmount so navigating away never silently drops it.
    useEffect(() => {
        return () => {
            const pending = pendingWearRef.current;
            if (pending) {
                window.clearTimeout(pending.timerId);
                void logWearRef.current(pending.itemIds, pending.moodId, pending.weather);
                pendingWearRef.current = null;
            }
        };
    }, []);

    return (
        <div className="space-y-5 md:space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                    Today's Looks
                </h1>
            </div>

            {/* Mood Picker — horizontal scroll, bleeds to screen edges */}
            <section>
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                    {MOODS.map(m => (
                        <button
                            key={m.id}
                            onClick={() => handleMoodChange(m.id)}
                            className={`flex-none inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.95] ${moodId === m.id
                                ? 'bg-primary text-white shadow-md'
                                : 'bg-olive-100 text-secondary hover:bg-olive-200'
                                }`}
                        >
                            <span className="text-sm">{getMoodIcon(m.id)}</span>
                            {m.name}
                        </button>
                    ))}
                </div>
            </section>

            {/* Loading */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
                    <div className="p-4 bg-olive-100 rounded-full mb-4">
                        <Loader2 className="w-8 h-8 text-secondary animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold text-primary mb-1">Curating Your Outfit</h3>
                    <p className="text-sm text-gray-500 max-w-xs">
                        Our AI stylist is picking the best looks for your mood and the weather...
                    </p>
                </div>
            )}

            {/* Error: Wardrobe Empty */}
            {!isLoading && error && error === 'wardrobe_empty' && (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
                    <div className="p-4 bg-olive-100 rounded-full mb-4">
                        <Frown className="w-8 h-8 text-secondary" />
                    </div>
                    <h3 className="text-lg font-semibold text-primary mb-1">Wardrobe is Empty</h3>
                    <p className="text-sm text-gray-500 mb-6">Upload some clothes to get personalized suggestions.</p>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-scanner'))}
                        className="inline-flex items-center px-6 py-2.5 bg-primary text-white rounded-full font-medium hover:bg-olive-700 transition-all active:scale-[0.97]"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Add Clothes
                    </button>
                </div>
            )}

            {/* Error: Generic */}
            {!isLoading && error && error !== 'wardrobe_empty' && (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
                    <div className="p-4 bg-red-50 rounded-full mb-4">
                        <Frown className="w-8 h-8 text-red-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Something Went Wrong</h3>
                    <p className="text-sm text-gray-500 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center px-6 py-2.5 bg-primary text-white rounded-full font-medium hover:bg-olive-700 transition-all active:scale-[0.97]"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Try Again
                    </button>
                </div>
            )}

            {/* Suggestions Carousel */}
            {!isLoading && !error && suggestions.length > 0 && (
                <div className="animate-fade-in-up">
                    {/* Intro text */}
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-olive-600">
                            {suggestions.length} {suggestions.length === 1 ? 'Outfit' : 'Outfits'} for you
                        </p>
                    </div>

                    {/* Swipe area */}
                    <div
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        <OutfitCard
                            key={suggestions[currentIndex].id}
                            suggestion={suggestions[currentIndex]}
                            onWear={() => handleWear(suggestions[currentIndex])}
                            onSkip={suggestions.length > 1 ? handleSkip : undefined}
                            onSkipLabel="Next Look"
                            reason={suggestions[currentIndex].isFallback ? null : describeOutfitReason(
                                suggestions[currentIndex],
                                { tryItItemIds, leastWornItemIds: computeSeasonalLeastWornIds(clothes, outfits) },
                                weather ?? undefined,
                            )}
                        />
                    </div>

                    {/* Pagination dots + arrows */}
                    {suggestions.length > 1 && (
                        <div className="flex items-center justify-center gap-4 mt-5">
                            <button
                                onClick={goToPrev}
                                disabled={currentIndex === 0}
                                className="p-2 rounded-full text-olive-400 hover:text-primary hover:bg-olive-100 transition-colors disabled:opacity-30 disabled:cursor-default"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <div className="flex gap-2">
                                {suggestions.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentIndex(i)}
                                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentIndex
                                            ? 'bg-primary w-6'
                                            : 'bg-olive-200 hover:bg-olive-300'
                                            }`}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={goToNext}
                                disabled={currentIndex === suggestions.length - 1}
                                className="p-2 rounded-full text-olive-400 hover:text-primary hover:bg-olive-100 transition-colors disabled:opacity-30 disabled:cursor-default"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {/* Generate More */}
                    <div className="text-center pt-6">
                        <button
                            onClick={handleRegenerate}
                            disabled={isRegenerating}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-olive-300 text-secondary text-sm font-semibold hover:bg-olive-50 transition-all active:scale-[0.97] disabled:opacity-50"
                        >
                            {isRegenerating
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                                : <><Sparkles className="w-4 h-4" /> Show Different Looks</>}
                        </button>
                    </div>
                </div>
            )}

            {!isLoading && !error && suggestions.length === 0 && (
                <div className="text-center py-16 text-gray-500 animate-fade-in-up">
                    <p className="font-medium">No suggestions yet. Try a different mood!</p>
                </div>
            )}

            {/* Pending wear confirmation toast */}
            {pendingWear && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
                    <div className="flex items-center gap-3 px-4 py-3 bg-primary text-white rounded-full shadow-lg text-sm font-medium">
                        Logging this outfit in 4s
                        <button
                            onClick={handleUndoWear}
                            className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-xs font-semibold"
                        >
                            Undo
                        </button>
                    </div>
                </div>
            )}

            {/* Logged confirmation toast */}
            {logged && (
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

export default Suggest;

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import { awsNovaService } from '../services/awsNova';
import { weatherService } from '../services/weatherService';
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
    const { clothes, logOutfitWear, userSettings, insights, tryItItemIds } = useWardrobe();
    const moodId = searchParams.get('mood') || userSettings?.preferredVibe || 'casual';
    const mood = MOODS.find(m => m.id === moodId) || MOODS[1];

    const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [logged, setLogged] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Touch handling for swipe
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    useEffect(() => {
        const fetchSuggestions = async () => {
            setIsLoading(true);
            setError(null);
            setCurrentIndex(0);

            try {
                const weatherData = await weatherService.getWeatherByCity('San Francisco');
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
                    leastWornItemIds: insights?.leastWornItems.map(i => i.id) ?? [],
                    tryItItemIds,
                };

                const outfits = await awsNovaService.suggestOutfits(clothes, mood, weatherData, userProfile, behavioralContext);
                setSuggestions(outfits);
            } catch (err) {
                console.error("Suggestion error:", err);
                setError('Failed to generate suggestions. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSuggestions();
    }, [clothes, mood]);

    const handleRegenerate = async () => {
        if (!weather) return;
        setIsRegenerating(true);
        try {
            // Prepare user profile data if available
            const userProfile = userSettings ? {
                gender: userSettings.gender,
                height: userSettings.height,
                weight: userSettings.weight
            } : undefined;

            const behavioralContext = {
                leastWornItemIds: insights?.leastWornItems.map(i => i.id) ?? [],
                tryItItemIds,
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
        const itemIds = suggestion.items.map(item => item.id);
        logOutfitWear(itemIds, moodId, weather);
        setLogged(true);
        setTimeout(() => setLogged(false), 2000);
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

    return (
        <div className="space-y-5 md:space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                    Today's Looks
                </h1>
                <p className="text-sm text-olive-500 mt-0.5">Pick a vibe, get styled</p>
            </div>

            {/* Mood Picker */}
            <section>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {MOODS.map(m => (
                        <button
                            key={m.id}
                            onClick={() => handleMoodChange(m.id)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.95] ${moodId === m.id
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
                            onSkip={suggestions.length > 1 ? goToNext : undefined}
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
                                : <><Sparkles className="w-4 h-4" /> Generate More</>}
                        </button>
                    </div>
                </div>
            )}

            {!isLoading && !error && suggestions.length === 0 && (
                <div className="text-center py-16 text-gray-500 animate-fade-in-up">
                    <p className="font-medium">No suggestions yet. Try a different mood!</p>
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

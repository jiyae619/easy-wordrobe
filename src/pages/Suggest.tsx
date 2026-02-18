import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useWardrobe } from '../context/WardrobeContext';
import { awsNovaService } from '../services/awsNova';
import { weatherService } from '../services/weatherService';
import { OutfitCard } from '../components/suggestions/OutfitCard';
import { WeatherSummary } from '../components/suggestions/WeatherSummary';
import { type OutfitSuggestion, type WeatherData } from '../types';
import { Sparkles, Loader2, RefreshCw, Frown, ArrowLeft, Smile } from 'lucide-react';

import { MOODS } from '../data/moods';

const Suggest: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { clothes } = useWardrobe();
    const navigate = useNavigate();
    const moodId = searchParams.get('mood') || 'casual';
    const mood = MOODS.find(m => m.id === moodId) || MOODS[1]; // Default to casual if not found

    const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        const fetchSuggestions = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const weatherData = await weatherService.getCurrentWeather();
                setWeather(weatherData);

                if (clothes.length === 0) {
                    setError('wardrobe_empty');
                    setIsLoading(false);
                    return;
                }

                const outfits = await awsNovaService.suggestOutfits(clothes, mood, weatherData);
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

    const handleSkip = () => {
        if (currentIndex < suggestions.length - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handleWear = (suggestion: OutfitSuggestion) => {
        console.log("Wearing outfit:", suggestion);
    };

    return (
        <div className="space-y-5 md:space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-olive-100 rounded-xl">
                        <Sparkles className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-primary">
                            Today's Looks
                        </h1>
                        <div className="flex items-center space-x-2 mt-0.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 bg-olive-100 text-secondary text-xs font-medium rounded-full capitalize">
                                <Smile className="w-3 h-3 mr-1" />
                                {mood.name}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/mood')}
                    className="flex items-center text-sm text-secondary font-medium hover:text-primary transition-colors"
                >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Change Mood
                </button>
            </div>

            {/* Weather */}
            {weather && <WeatherSummary weather={weather} />}

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

            {/* Error */}
            {!isLoading && error && error === 'wardrobe_empty' && (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
                    <div className="p-4 bg-olive-100 rounded-full mb-4">
                        <Frown className="w-8 h-8 text-secondary" />
                    </div>
                    <h3 className="text-lg font-semibold text-primary mb-1">Wardrobe is Empty</h3>
                    <p className="text-sm text-gray-500 mb-6">Upload some clothes to get personalized suggestions.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="inline-flex items-center px-6 py-2.5 bg-primary text-white rounded-full font-medium hover:bg-olive-700 transition-all active:scale-[0.97]"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Add Clothes
                    </button>
                </div>
            )}

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

            {/* Suggestions */}
            {!isLoading && !error && suggestions.length > 0 && (
                <div className="space-y-6 animate-fade-in-up">
                    <OutfitCard
                        suggestion={suggestions[currentIndex]}
                        onSkip={handleSkip}
                        onWear={() => handleWear(suggestions[currentIndex])}
                        isLast={currentIndex === suggestions.length - 1}
                    />
                    <div className="flex justify-center">
                        <div className="flex space-x-2">
                            {suggestions.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentIndex(i)}
                                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === currentIndex
                                        ? 'bg-primary w-7'
                                        : 'bg-olive-200 hover:bg-olive-300'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!isLoading && !error && suggestions.length === 0 && (
                <div className="text-center py-16 text-gray-500 animate-fade-in-up">
                    <p className="font-medium">No suggestions yet. Try a different mood!</p>
                </div>
            )}
        </div>
    );
};

export default Suggest;

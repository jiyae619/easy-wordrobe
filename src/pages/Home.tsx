import React, { useState, useEffect } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import { Cloud, Sun, CloudRain, Wind, Sparkles, Lightbulb, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { awsNovaService } from '../services/awsNova';
import { weatherService } from '../services/weatherService';
import { type OutfitSuggestion, type WeatherData } from '../types';
import { MOODS } from '../data/moods';

const Home: React.FC = () => {
    const { clothes } = useWardrobe();
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [quickOutfit, setQuickOutfit] = useState<OutfitSuggestion | null>(null);
    const [outfitLoading, setOutfitLoading] = useState(false);

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
        const loadData = async () => {
            try {
                // Request geolocation consent and fetch weather by coords
                let weatherData: WeatherData;
                try {
                    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
                    });
                    weatherData = await weatherService.getCurrentWeather(
                        position.coords.latitude,
                        position.coords.longitude
                    );
                } catch {
                    // Location denied or unavailable — fallback to default
                    weatherData = await weatherService.getWeatherByCity('San Francisco');
                }
                setWeather(weatherData);

                if (clothes.length > 0) {
                    setOutfitLoading(true);
                    const casualMood = MOODS.find(m => m.id === 'casual') || MOODS[1];
                    const outfits = await awsNovaService.suggestOutfits(clothes, casualMood, weatherData);
                    if (outfits.length > 0) {
                        setQuickOutfit(outfits[0]);
                    }
                    setOutfitLoading(false);
                }
            } catch (err) {
                console.error("Home data load error:", err);
                setOutfitLoading(false);
            }
        };
        loadData();
    }, [clothes.length]);

    const temp = weather?.temperature ?? 72;
    const condition = weather?.condition ?? 'Sunny';
    const location = weather?.location ?? 'New York, NY';

    return (
        <div className="space-y-8">
            {/* Greeting Header */}
            <section>
                <h1 className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                    {getGreeting()} 👋
                </h1>
            </section>

            {/* Quick Outfit Suggestion */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold tracking-tight text-primary">Today's Quick Pick</h2>
                    <Link to="/suggest" className="text-sm font-semibold text-secondary hover:underline">
                        See More
                    </Link>
                </div>

                {outfitLoading && (
                    <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in-up">
                        <div className="p-3 bg-olive-100 rounded-full mb-3">
                            <Loader2 className="w-6 h-6 text-secondary animate-spin" />
                        </div>
                        <p className="text-sm text-olive-500">Finding a look for today's weather...</p>
                    </div>
                )}

                {!outfitLoading && quickOutfit && (
                    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-muted animate-fade-in-up">
                        {/* Items Grid */}
                        <div className="grid grid-cols-3 gap-1 p-2">
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

                        {/* Explanation */}
                        <div className="p-4">
                            {quickOutfit.explanation && (
                                <p className="text-sm text-olive-600 leading-relaxed mb-3">
                                    {quickOutfit.explanation}
                                </p>
                            )}
                            <Link
                                to="/suggest"
                                className="w-full bg-primary hover:bg-olive-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-[0.97]"
                            >
                                <Sparkles className="w-4 h-4" />
                                See Full Suggestions
                            </Link>
                        </div>
                    </div>
                )}

                {!outfitLoading && !quickOutfit && clothes.length === 0 && (
                    <div className="bg-white rounded-2xl border border-muted p-8 text-center animate-fade-in-up">
                        <div className="p-3 bg-olive-100 rounded-full w-fit mx-auto mb-3">
                            <Sparkles className="w-6 h-6 text-secondary" />
                        </div>
                        <h3 className="font-semibold text-primary mb-1">Start Your Wardrobe</h3>
                        <p className="text-sm text-olive-500 mb-4">Upload clothes to get AI-powered outfit suggestions.</p>
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('open-scanner'))}
                            className="inline-flex items-center px-6 py-2.5 bg-primary text-white rounded-full font-medium hover:bg-olive-700 transition-all active:scale-[0.97]"
                        >
                            Add Your First Item
                        </button>
                    </div>
                )}

                {!outfitLoading && !quickOutfit && clothes.length > 0 && (
                    <div className="bg-white rounded-2xl border border-muted p-8 text-center animate-fade-in-up">
                        <p className="text-sm text-olive-500">Couldn't generate a suggestion right now.</p>
                        <Link
                            to="/suggest"
                            className="inline-flex items-center mt-3 px-6 py-2.5 bg-primary text-white rounded-full font-medium hover:bg-olive-700 transition-all active:scale-[0.97]"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Get Suggestions
                        </Link>
                    </div>
                )}
            </section>

            {/* Weather & Stylist Tip Section */}
            <section>
                <div className="rounded-2xl bg-gradient-to-br from-olive-100/80 to-olive-50 border border-olive-200/60 p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                {getWeatherIcon()}
                                <span className="text-lg font-medium tracking-tight text-primary">
                                    {temp}°F | {condition}
                                </span>
                            </div>

                        </div>
                        <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                                {location}
                            </p>

                        </div>
                    </div>

                    {/* Integrated Stylist Tip */}
                    <div className="pt-4 mt-4 border-t border-olive-200/60 flex gap-3">
                        <Lightbulb className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-olive-500 mb-1">
                                Stylist Tip
                            </p>
                            <p className="text-sm leading-relaxed text-olive-700">
                                Since it's clear skies, consider adding a pair of classic aviators to your{' '}
                                <span className="text-secondary font-semibold">everyday look</span>{' '}
                                for an effortless commute.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;

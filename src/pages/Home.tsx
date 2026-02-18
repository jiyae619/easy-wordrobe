import React, { useState } from 'react';
import { useWardrobe } from '../context/WardrobeContext';
import { Cloud, Sun, CloudRain, Wind, Camera, Sparkles, Lightbulb, Database } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CameraScannerOverlay } from '../components/upload/CameraScannerOverlay';

const Home: React.FC = () => {
    const { clothes, weather, populateDemoData, isLoading } = useWardrobe();
    const [showScanner, setShowScanner] = useState(false);

    // Weather icon helper
    const getWeatherIcon = () => {
        if (!weather) return <Sun className="w-6 h-6 text-olive-600" />;
        const condition = weather.condition.toLowerCase();
        if (condition.includes('rain')) return <CloudRain className="w-6 h-6 text-olive-600" />;
        if (condition.includes('cloud')) return <Cloud className="w-6 h-6 text-olive-600" />;
        if (condition.includes('wind')) return <Wind className="w-6 h-6 text-olive-600" />;
        return <Sun className="w-6 h-6 text-olive-600" />;
    };

    // Demo outfit suggestions
    const outfitSuggestions = [
        {
            name: 'The Modern Professional',
            description: 'Navy Blazer + White Tee + Selvedge Jeans',
            wornCount: 2,
            image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop',
        },
        {
            name: 'Casual Chic',
            description: 'Knit Sweater + Dark Chinos + Leather Loafers',
            wornCount: 1,
            image: 'https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=400&h=600&fit=crop',
        },
        {
            name: 'Weekend Active',
            description: 'Denim Jacket + Grey Hoodie + Black Joggers',
            wornCount: 0,
            image: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&h=600&fit=crop',
        },
    ];

    const temp = weather?.temperature ?? 72;
    const condition = weather?.condition ?? 'Sunny';
    const location = weather?.location ?? 'New York, NY';
    const feelsLike = weather?.feelsLike ?? 74;

    return (
        <>
            <div className="space-y-6 md:space-y-8">
                {/* Weather Section */}
                <section>
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-olive-100/80 to-olive-50 border border-olive-200/60 p-5 md:p-6">
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    {getWeatherIcon()}
                                    <span className="text-2xl font-bold tracking-tight text-primary">
                                        {temp}°F | {condition}
                                    </span>
                                </div>
                                <p className="text-olive-600 font-medium text-sm">
                                    Perfect for light layers today.
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                                    {location}
                                </p>
                                <p className="text-xs text-olive-400">Feels like {feelsLike}°F</p>
                            </div>
                        </div>
                        {/* Decorative element */}
                        <div className="absolute -right-4 -bottom-4 opacity-[0.07]">
                            <Sun className="w-28 h-28 text-olive-800" />
                        </div>
                    </div>
                </section>

                {/* Stats Bar & Dev Controls */}
                <div className="flex items-center justify-between">
                    <p className="text-sm text-olive-500">
                        <span className="font-semibold text-primary">{clothes.length}</span> items in your wardrobe
                    </p>
                    {import.meta.env.DEV && (
                        <button
                            onClick={populateDemoData}
                            disabled={isLoading}
                            className="flex items-center px-4 py-2 text-xs font-medium text-secondary bg-olive-100 rounded-full hover:bg-olive-200 transition-all active:scale-[0.97] border border-olive-200"
                        >
                            <Database className="w-3.5 h-3.5 mr-1.5" />
                            {isLoading ? 'Loading...' : 'Demo Data'}
                        </button>
                    )}
                </div>

                {/* Daily Suggestions Carousel */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold tracking-tight text-primary">Daily Suggestions</h2>
                        <Link to="/suggest" className="text-sm font-semibold text-secondary hover:underline">
                            See All
                        </Link>
                    </div>

                    <div className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pb-2">
                        {outfitSuggestions.map((outfit, index) => (
                            <div key={index} className="flex-none w-[82%] md:w-[60%] lg:w-[40%] snap-center">
                                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-muted transition-transform duration-300 active:scale-[0.98]">
                                    <div
                                        className="relative aspect-[3/4] bg-olive-100 bg-cover bg-center"
                                        style={{ backgroundImage: `url('${outfit.image}')` }}
                                    >
                                        <div className="absolute top-4 left-4">
                                            <span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest text-primary shadow-sm border border-white/20">
                                                Worn {outfit.wornCount}× this month
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <h3 className="text-lg font-bold text-primary mb-1">{outfit.name}</h3>
                                        <p className="text-sm text-olive-500 mb-4">{outfit.description}</p>
                                        <button className="w-full bg-primary hover:bg-olive-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-[0.97]">
                                            <Sparkles className="w-4 h-4" />
                                            Wear This
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Stylist Tip */}
                <section>
                    <div className="p-4 rounded-2xl bg-olive-50 border-l-4 border-secondary">
                        <div className="flex gap-3">
                            <Lightbulb className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-olive-400 mb-1">
                                    Stylist Tip
                                </p>
                                <p className="text-sm leading-relaxed text-olive-700">
                                    Since it's clear skies, consider adding a pair of classic aviators to your{' '}
                                    <span className="text-secondary font-semibold">Modern Professional</span>{' '}
                                    look for an effortless commute.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Floating Action Button — Take Photos */}
            <button
                onClick={() => setShowScanner(true)}
                className="fixed bottom-24 md:bottom-8 right-5 md:right-8 w-14 h-14 bg-primary text-white rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform z-30 active:scale-95"
            >
                <Camera className="w-6 h-6" />
            </button>

            {/* Camera Scanner Overlay */}
            <CameraScannerOverlay isOpen={showScanner} onClose={() => setShowScanner(false)} />
        </>
    );
};

export default Home;

import React from 'react';
import { type WeatherData } from '../../types';
import { weatherService } from '../../services/weatherService';
import { Cloud, Sun, CloudRain, Wind, Thermometer } from 'lucide-react';

interface WeatherSummaryProps {
    weather: WeatherData;
}

export const WeatherSummary: React.FC<WeatherSummaryProps> = ({ weather }) => {
    const recommendations = weatherService.getWeatherRecommendation(weather);

    const getWeatherIcon = () => {
        const condition = weather.condition.toLowerCase();
        if (condition.includes('rain')) return <CloudRain className="w-8 h-8 text-white" />;
        if (condition.includes('cloud')) return <Cloud className="w-8 h-8 text-white" />;
        if (condition.includes('wind')) return <Wind className="w-8 h-8 text-white" />;
        return <Sun className="w-8 h-8 text-white" />;
    };

    return (
        <div className="bg-gradient-to-r from-primary via-olive-700 to-secondary rounded-2xl p-4 md:p-6 text-white shadow-lg">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">

                {/* Weather Info */}
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-sm">
                        {getWeatherIcon()}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold flex items-center">
                            {weather.temperature}°C
                            <span className="text-sm font-normal ml-2 opacity-80 capitalize">
                                {weather.condition} in {weather.location}
                            </span>
                        </h2>
                        <div className="flex items-center text-sm opacity-70 space-x-3 mt-1">
                            <span className="flex items-center">
                                <Thermometer className="w-3 h-3 mr-1" />
                                Feels like {weather.feelsLike}°C
                            </span>
                            <span className="flex items-center">
                                <Wind className="w-3 h-3 mr-1" />
                                {weather.windSpeed} km/h
                            </span>
                        </div>
                    </div>
                </div>

                {/* AI Recommendation */}
                <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm md:max-w-md w-full border border-white/10">
                    <p className="font-medium text-sm mb-1.5 opacity-90">AI Recommendation:</p>
                    <ul className="text-sm space-y-1 opacity-80">
                        {recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start">
                                <span className="mr-2 text-accent">•</span>
                                {rec}
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
        </div>
    );
};

import axios from 'axios';
import { type WeatherData } from '../types';

const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "";
const BASE_URL = "https://api.openweathermap.org/data/2.5/weather";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export const weatherService = {
    /**
     * Get current weather by latitude and longitude.
     */
    getCurrentWeather: async (lat: number, lon: number): Promise<WeatherData> => {
        if (USE_MOCK) {
            return getMockWeather();
        }

        try {
            const response = await axios.get(BASE_URL, {
                params: {
                    lat,
                    lon,
                    appid: API_KEY,
                    units: 'metric', // Census
                },
            });
            return mapResponseToWeatherData(response.data);
        } catch (error) {
            console.error("Error fetching weather:", error);
            throw new Error("Failed to fetch weather data.");
        }
    },

    /**
     * Get current weather by city name.
     */
    getWeatherByCity: async (city: string): Promise<WeatherData> => {
        if (USE_MOCK) {
            return getMockWeather(city);
        }

        try {
            const response = await axios.get(BASE_URL, {
                params: {
                    q: city,
                    appid: API_KEY,
                    units: 'metric',
                },
            });
            return mapResponseToWeatherData(response.data);
        } catch (error) {
            console.error("Error fetching weather for city:", error);
            throw new Error(`Failed to fetch weather for ${city}.`);
        }
    },

    /**
     * Generate clothing recommendations based on weather conditions.
     */
    getWeatherRecommendation: (weather: WeatherData): string[] => {
        const recommendations: string[] = [];

        // Temperature-based recommendations
        if (weather.temperature < 5) {
            recommendations.push("Heavy layers, coat, warm accessories");
        } else if (weather.temperature >= 5 && weather.temperature < 15) {
            recommendations.push("Light jacket or sweater, layers");
        } else if (weather.temperature >= 15 && weather.temperature < 25) {
            recommendations.push("Light clothing, optional light layer");
        } else {
            recommendations.push("Light, breathable fabrics");
        }

        // Condition-based recommendations
        const condition = weather.condition.toLowerCase();
        if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunderstorm")) {
            recommendations.push("Waterproof layer, closed shoes");
        }
        if (condition.includes("snow")) {
            recommendations.push("Waterproof boots, warm socks");
        }

        // Wind-based recommendations
        if (weather.windSpeed > 20) { // arbitrary threshold for "windy" in km/h approx
            recommendations.push("Windbreaker or layered outfit");
        }

        return recommendations;
    }
};

// ==========================================
// Helper Functions
// ==========================================

function mapResponseToWeatherData(data: any): WeatherData {
    return {
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        condition: data.weather[0]?.main || "Unknown",
        humidity: data.main.humidity,
        windSpeed: data.wind.speed, // m/s usually from API, keep as is or convert
        location: data.name,
    };
}

function getMockWeather(locationName: string = "San Francisco"): WeatherData {
    return {
        temperature: 22,
        feelsLike: 23,
        condition: "Sunny",
        humidity: 45,
        windSpeed: 12,
        location: locationName,
    };
}

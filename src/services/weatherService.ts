import axios from 'axios';
import { type WeatherData } from '../types';

// ==========================================
// NWS (National Weather Service) API — Free, no API key required
// Docs: https://www.weather.gov/documentation/services-web-api
// ==========================================

const NWS_BASE = "https://api.weather.gov";
const NWS_HEADERS = {
    "User-Agent": "(WardrobeAI, wardrobe-ai-app)",
    "Accept": "application/geo+json",
};

// Simple city → lat/lon lookup for common cities (avoids needing a geocoding API)
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
    "san francisco": { lat: 37.7749, lon: -122.4194 },
    "new york": { lat: 40.7128, lon: -74.0060 },
    "los angeles": { lat: 34.0522, lon: -118.2437 },
    "chicago": { lat: 41.8781, lon: -87.6298 },
    "seattle": { lat: 47.6062, lon: -122.3321 },
    "miami": { lat: 25.7617, lon: -80.1918 },
    "boston": { lat: 42.3601, lon: -71.0589 },
    "denver": { lat: 39.7392, lon: -104.9903 },
    "austin": { lat: 30.2672, lon: -97.7431 },
    "portland": { lat: 45.5152, lon: -122.6784 },
};

export const weatherService = {
    /**
     * Get current weather by latitude and longitude using NWS API.
     * Flow: /points/{lat},{lon} → get forecast URL → fetch current period
     */
    getCurrentWeather: async (lat: number, lon: number): Promise<WeatherData> => {
        try {
            // Step 1: Get grid point info from coordinates
            const pointsUrl = `${NWS_BASE}/points/${lat.toFixed(4)},${lon.toFixed(4)}`;
            const pointsResponse = await axios.get(pointsUrl, { headers: NWS_HEADERS });
            const props = pointsResponse.data.properties;

            // Step 2: Fetch the forecast using the URL from the points response
            const forecastUrl = props.forecast;
            const forecastResponse = await axios.get(forecastUrl, { headers: NWS_HEADERS });
            const currentPeriod = forecastResponse.data.properties.periods[0];

            // Step 3: Fetch observation station for humidity data
            let humidity = 50; // default
            try {
                const stationsUrl = props.observationStations;
                const stationsResponse = await axios.get(stationsUrl, { headers: NWS_HEADERS });
                const stationId = stationsResponse.data.features[0]?.properties?.stationIdentifier;
                if (stationId) {
                    const obsUrl = `${NWS_BASE}/stations/${stationId}/observations/latest`;
                    const obsResponse = await axios.get(obsUrl, { headers: NWS_HEADERS });
                    const obsHumidity = obsResponse.data.properties?.relativeHumidity?.value;
                    if (obsHumidity != null) humidity = Math.round(obsHumidity);
                }
            } catch {
                // Humidity fetch is best-effort, use default
            }

            // NWS returns temperature in Fahrenheit by default — convert to Celsius
            const tempF = currentPeriod.temperature;
            const tempC = Math.round((tempF - 32) * 5 / 9);

            // Estimate wind speed from the windSpeed string (e.g. "10 mph" or "5 to 15 mph")
            const windMatch = currentPeriod.windSpeed?.match(/(\d+)/);
            const windMph = windMatch ? parseInt(windMatch[1]) : 0;
            const windKmh = Math.round(windMph * 1.609);

            // Extract location name from the points response
            const location = props.relativeLocation?.properties?.city
                ? `${props.relativeLocation.properties.city}, ${props.relativeLocation.properties.state}`
                : "Unknown";

            return {
                temperature: tempC,
                feelsLike: tempC, // NWS doesn't provide feels-like in the forecast endpoint
                condition: currentPeriod.shortForecast || "Unknown",
                humidity,
                windSpeed: windKmh,
                location,
            };
        } catch (error) {
            console.error("[NWS API] Error fetching weather:", error);
            // Fall back to mock if NWS API fails
            console.warn("[NWS API] Falling back to mock weather data");
            return getMockWeather();
        }
    },

    /**
     * Get weather by city name. Looks up lat/lon from built-in map, then uses NWS.
     * Falls back to browser geolocation if city is not in the map.
     */
    getWeatherByCity: async (city: string): Promise<WeatherData> => {
        const normalizedCity = city.toLowerCase().trim();
        const coords = CITY_COORDS[normalizedCity];

        if (coords) {
            return weatherService.getCurrentWeather(coords.lat, coords.lon);
        }

        // Try browser geolocation as fallback
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            return weatherService.getCurrentWeather(
                position.coords.latitude,
                position.coords.longitude
            );
        } catch {
            console.warn(`[NWS API] City "${city}" not found and geolocation unavailable, using mock`);
            return getMockWeather(city);
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
        if (weather.windSpeed > 20) {
            recommendations.push("Windbreaker or layered outfit");
        }

        return recommendations;
    }
};

// ==========================================
// Mock Data (fallback)
// ==========================================

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

import { type WeatherData, type WeatherOutlookPeriod } from '/src/types/index';
import { setSeasonLatitude } from '/src/services/agents/agentOutputGuards';
import { DEMO_WEATHER } from './seed';

export const SUPPORTED_CITIES = [
    "San Francisco", "New York", "Los Angeles", "Chicago", "Seattle",
    "Miami", "Boston", "Denver", "Austin", "Portland",
] as const;

const OUTLOOK: WeatherOutlookPeriod[] = [
    { label: 'morning', temperature: 15, condition: 'Partly Cloudy' },
    { label: 'daytime', temperature: 19, condition: 'Mostly Sunny' },
    { label: 'evening', temperature: 14, condition: 'Clear' },
];
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const weatherService = {
    getCurrentWeather: async (lat: number, _lon: number): Promise<WeatherData> => {
        setSeasonLatitude(lat);
        await wait(150);
        return { ...DEMO_WEATHER };
    },
    getWeatherOutlook: async (lat: number, _lon: number): Promise<WeatherOutlookPeriod[]> => {
        setSeasonLatitude(lat);
        await wait(150);
        return OUTLOOK.map((p) => ({ ...p }));
    },
    getWeatherByCity: async (_city: string): Promise<WeatherData> => weatherService.getCurrentWeather(40.7128, -74.006),
    getWeatherOutlookByCity: async (_city: string): Promise<WeatherOutlookPeriod[]> => weatherService.getWeatherOutlook(40.7128, -74.006),
    getWeatherRecommendation: (weather: WeatherData): string[] => {
        const recommendations: string[] = [];
        if (weather.temperature < 5) recommendations.push("Heavy layers, coat, warm accessories");
        else if (weather.temperature < 15) recommendations.push("Light jacket or sweater, layers");
        else if (weather.temperature < 25) recommendations.push("Light clothing, optional light layer");
        else recommendations.push("Light, breathable fabrics");
        const condition = weather.condition.toLowerCase();
        if (condition.includes("rain") || condition.includes("drizzle") || condition.includes("thunderstorm")) recommendations.push("Waterproof layer, closed shoes");
        if (condition.includes("snow")) recommendations.push("Waterproof boots, warm socks");
        if (weather.windSpeed > 20) recommendations.push("Windbreaker or layered outfit");
        return recommendations;
    },
};

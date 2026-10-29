import { describe, expect, it } from "vitest";
import { weatherCacheBucket } from "../useStylistLooks";

describe("stylist looks cache key: weather bucket", () => {
    it("ignores small changes in the reading so a 30-minute refresh does not re-run the stylist", () => {
        expect(weatherCacheBucket({ temperature: 18, condition: "Partly Cloudy" }))
            .toBe(weatherCacheBucket({ temperature: 21.4, condition: "Mostly Sunny" }));
    });

    it("changes across the temperature bands computeWeatherMatch scores against", () => {
        const at = (temperature: number) => weatherCacheBucket({ temperature, condition: "Clear" });
        expect(at(5)).not.toBe(at(6));
        expect(at(15)).not.toBe(at(16));
        expect(at(24)).not.toBe(at(25));
    });

    it("splits wet from dry, and has a bucket for no weather at all", () => {
        expect(weatherCacheBucket({ temperature: 12, condition: "Light Rain" }))
            .not.toBe(weatherCacheBucket({ temperature: 12, condition: "Cloudy" }));
        expect(weatherCacheBucket({ temperature: 12, condition: "Chance Showers" }))
            .toBe(weatherCacheBucket({ temperature: 12, condition: "Thunderstorms" }));
        expect(weatherCacheBucket(null)).toBe("noweather");
    });
});

import { useState, useEffect } from 'react';

interface LocationState {
    latitude: number | null;
    longitude: number | null;
    loading: boolean;
    error: string | null;
}

export const useUserLocation = () => {
    const [location, setLocation] = useState<LocationState>({
        latitude: null,
        longitude: null,
        loading: true,
        error: null,
    });

    useEffect(() => {
        if (!navigator.geolocation) {
            setLocation({
                latitude: null,
                longitude: null,
                loading: false,
                error: "Geolocation is not supported by your browser",
            });
            return;
        }

        const success = (position: GeolocationPosition) => {
            setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                loading: false,
                error: null,
            });
        };

        const error = () => {
            // Fallback to default location (e.g., New York) on error/denial
            setLocation({
                latitude: 40.7128,
                longitude: -74.0060,
                loading: false,
                error: "Location access denied. Using default location.",
            });
        };

        navigator.geolocation.getCurrentPosition(success, error);
    }, []);

    return location;
};

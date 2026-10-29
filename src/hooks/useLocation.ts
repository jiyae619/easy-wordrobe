import { useState, useEffect } from 'react';

interface LocationState {
    latitude: number | null;
    longitude: number | null;
    loading: boolean;
    error: string | null;
}

export const useUserLocation = () => {
    const [location, setLocation] = useState<LocationState>(() => ({
        latitude: null,
        longitude: null,
        loading: Boolean(navigator.geolocation),
        error: navigator.geolocation ? null : "Geolocation is not supported by your browser",
    }));

    useEffect(() => {
        if (!navigator.geolocation) return;

        const success = (position: GeolocationPosition) => {
            setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                loading: false,
                error: null,
            });
        };

        const error = () => {
            // No silent default city: callers must handle "no location" explicitly.
            setLocation({
                latitude: null,
                longitude: null,
                loading: false,
                error: "Location access denied or unavailable.",
            });
        };

        navigator.geolocation.getCurrentPosition(success, error);
    }, []);

    return location;
};

import { useState, useEffect } from 'react';

interface GeoData {
    country: string | null;
    countryCode: string | null;
    isInternational: boolean | null;
    loading: boolean;
}

export function useGeoLocation() {
    const [geoData, setGeoData] = useState<GeoData>({
        country: null,
        countryCode: null,
        isInternational: null,
        loading: true,
    });

    useEffect(() => {
        // Check session storage to avoid repeated API calls
        const cachedData = sessionStorage.getItem('mm_geo_data');
        if (cachedData) {
            setGeoData(JSON.parse(cachedData));
            return;
        }

        const fetchGeoLocation = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                if (!response.ok) throw new Error('Geo API failed');

                const data = await response.json();

                // Define result
                const result: GeoData = {
                    country: data.country_name || null,
                    countryCode: data.country_code || null,
                    isInternational: data.country_code !== 'IN', // True if not India
                    loading: false,
                };

                // Save to session storage
                sessionStorage.setItem('mm_geo_data', JSON.stringify(result));
                setGeoData(result);
            } catch (error) {
                console.error('Failed to fetch location:', error);
                // On error, set loading to false but keep data null (safe fallback)
                setGeoData(prev => ({ ...prev, loading: false }));
            }
        };

        fetchGeoLocation();
    }, []);

    return geoData;
}

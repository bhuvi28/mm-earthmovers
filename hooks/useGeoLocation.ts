import { useState, useEffect } from 'react';
import { getTracker } from '@/lib/analytics/tracker';

interface GeoData {
    country: string | null;
    countryCode: string | null;
    isInternational: boolean | null;
    loading: boolean;
}

const IPAPI_OPS_STORAGE_KEY = 'mm_ipapi_client_ops_sent';
const IPAPI_TIMEOUT_MS = 5000;
let inFlightGeoRequest: Promise<GeoData> | null = null;
let ipapiClientOpsSent = false;

function emitIpapiClientOps(
    outcome: 'ok' | 'http_error' | 'timeout' | 'error',
    durationMs: number,
    statusCode?: number
) {
    if (ipapiClientOpsSent) return;
    try {
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(IPAPI_OPS_STORAGE_KEY) === '1') {
            ipapiClientOpsSent = true;
            return;
        }
        ipapiClientOpsSent = true;
        if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem(IPAPI_OPS_STORAGE_KEY, '1');
        }
    } catch {
        ipapiClientOpsSent = true;
    }

    try {
        getTracker().track?.('client_ops', {
            metadata: {
                target: 'ipapi_co',
                outcome,
                ...(statusCode !== undefined ? { statusCode } : {}),
                durationMs,
            },
        });
    } catch {}
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
        try {
            const cachedData = sessionStorage.getItem('mm_geo_data');
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                if (parsed && typeof parsed === 'object') {
                    setGeoData(parsed as GeoData);
                    return;
                }
            }
        } catch {}

        let cancelled = false;

        if (!inFlightGeoRequest) {
            inFlightGeoRequest = (async (): Promise<GeoData> => {
                const controller = new AbortController();
                let timedOut = false;
                const timeoutId = setTimeout(() => {
                    timedOut = true;
                    controller.abort();
                }, IPAPI_TIMEOUT_MS);
                const startMs = performance.now();

                try {
                    const response = await fetch('https://ipapi.co/json/', {
                        signal: controller.signal,
                    });
                    const durationMs = Math.max(0, Math.round(performance.now() - startMs));

                    if (!response.ok) {
                        emitIpapiClientOps('http_error', durationMs, response.status);
                        return {
                            country: null,
                            countryCode: null,
                            isInternational: null,
                            loading: false,
                        };
                    }

                    const data = await response.json();
                    emitIpapiClientOps('ok', durationMs, response.status);

                    const result: GeoData = {
                        country: data.country_name || null,
                        countryCode: data.country_code || null,
                        isInternational: data.country_code !== 'IN', // True if not India
                        loading: false,
                    };

                    try {
                        sessionStorage.setItem('mm_geo_data', JSON.stringify(result));
                    } catch {}

                    return result;
                } catch (error) {
                    const durationMs = Math.max(0, Math.round(performance.now() - startMs));
                    const outcome =
                        timedOut || (error instanceof Error && error.name === 'AbortError')
                            ? 'timeout'
                            : 'error';
                    emitIpapiClientOps(outcome, durationMs);
                    console.error('Failed to fetch location:', error);
                    return {
                        country: null,
                        countryCode: null,
                        isInternational: null,
                        loading: false,
                    };
                } finally {
                    clearTimeout(timeoutId);
                    inFlightGeoRequest = null;
                }
            })();
        }

        inFlightGeoRequest.then((result) => {
            if (!cancelled) {
                setGeoData(result);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return geoData;
}

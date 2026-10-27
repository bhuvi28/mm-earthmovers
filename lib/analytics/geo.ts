export interface GeoLocationResult {
  country?: string;
  countryCode?: string;
  region?: string;
  city?: string;
}

// In-memory cache to prevent redundant lookups for active visitors
const ipGeoCache = new Map<string, GeoLocationResult>();

const COUNTRY_NAMES: Record<string, string> = {
  IN: 'India',
  US: 'United States',
  GB: 'United Kingdom',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
  DE: 'Germany',
  AU: 'Australia',
  CA: 'Canada',
  FR: 'France',
  SA: 'Saudi Arabia',
  QA: 'Qatar',
  OM: 'Oman',
  KW: 'Kuwait',
  ZA: 'South Africa',
  NP: 'Nepal',
  BD: 'Bangladesh',
  LK: 'Sri Lanka',
  BT: 'Bhutan',
};

function resolveCountryName(code?: string): string | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  return COUNTRY_NAMES[upper] || upper;
}

function isValidPublicIp(ip: string): boolean {
  if (!ip || ip === '127.0.0.1' || ip === '::1') return false;
  if (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.31.')
  ) {
    return false;
  }
  return true;
}

/**
 * Accurately extracts visitor geolocation.
 * 
 * When a site is proxied via Cloudflare:
 * - Vercel's `x-vercel-ip-*` headers reflect Cloudflare's proxy/datacenter nodes (e.g. Singapore, Marseille, Hong Kong).
 * - Cloudflare's `cf-connecting-ip` is the REAL client public IP.
 * - Cloudflare's `cf-ipcountry` is the REAL client country.
 * - If `cf-ipcity` is not present, we resolve the client IP via high-speed resolver and cache in memory.
 */
export async function extractGeolocation(headers: Headers): Promise<GeoLocationResult> {
  const cfConnectingIp = headers.get('cf-connecting-ip');
  const cfRay = headers.get('cf-ray');
  const isCloudflare = Boolean(cfConnectingIp || cfRay);

  const xForwardedFor = headers.get('x-forwarded-for');
  const clientIp =
    cfConnectingIp ||
    (xForwardedFor ? xForwardedFor.split(',')[0].trim() : '') ||
    headers.get('x-real-ip') ||
    '';

  // 1. Cloudflare True Visitor Headers
  let countryCode = headers.get('cf-ipcountry') || undefined;
  let rawCity = headers.get('cf-ipcity') || undefined;
  let region = headers.get('cf-region') || headers.get('cf-region-code') || undefined;

  let city: string | undefined = undefined;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity);
    } catch {
      city = rawCity;
    }
  }

  // 2. Direct Vercel Headers (ONLY when NOT proxied via Cloudflare)
  if (!isCloudflare) {
    countryCode = countryCode || headers.get('x-vercel-ip-country') || undefined;
    region = region || headers.get('x-vercel-ip-country-region') || undefined;
    const vercelCity = headers.get('x-vercel-ip-city');
    if (vercelCity && !city) {
      try {
        city = decodeURIComponent(vercelCity);
      } catch {
        city = vercelCity;
      }
    }
  }

  // 3. Fallback: If city is missing or if Cloudflare didn't pass city, resolve client IP
  if ((!city || !countryCode) && clientIp && isValidPublicIp(clientIp)) {
    if (ipGeoCache.has(clientIp)) {
      const cached = ipGeoCache.get(clientIp)!;
      return {
        country: cached.country || resolveCountryName(countryCode),
        countryCode: cached.countryCode || countryCode,
        region: cached.region || region,
        city: cached.city || city,
      };
    }

    try {
      const res = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,countryCode,region,city`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'success') {
          const resolvedCountryCode = data.countryCode || countryCode;
          const resolved: GeoLocationResult = {
            country: data.country || resolveCountryName(resolvedCountryCode),
            countryCode: resolvedCountryCode,
            region: data.region || region,
            city: data.city || city,
          };

          if (ipGeoCache.size > 2000) {
            const firstKey = ipGeoCache.keys().next().value;
            if (firstKey) ipGeoCache.delete(firstKey);
          }
          ipGeoCache.set(clientIp, resolved);
          return resolved;
        }
      }
    } catch {
      // Non-blocking fallback
    }
  }

  return {
    country: resolveCountryName(countryCode),
    countryCode,
    region,
    city,
  };
}

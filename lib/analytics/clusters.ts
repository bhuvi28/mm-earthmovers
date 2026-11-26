export type IndustrialClusterId = 'mining' | 'infra' | 'oem_quarry';

export interface IndustrialClusterInfo {
  id: IndustrialClusterId;
  name: 'Mining Cluster' | 'Infra & Fleets' | 'OEM & Quarry';
  icon: '⛏️' | '🏗️' | '🏭';
  label: string;
  bg: string;
}

const CLUSTER_CATALOG: Record<IndustrialClusterId, IndustrialClusterInfo> = {
  oem_quarry: {
    id: 'oem_quarry',
    name: 'OEM & Quarry',
    icon: '🏭',
    label: '🏭 OEM & Quarry',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  mining: {
    id: 'mining',
    name: 'Mining Cluster',
    icon: '⛏️',
    label: '⛏️ Mining Cluster',
    bg: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  infra: {
    id: 'infra',
    name: 'Infra & Fleets',
    icon: '🏗️',
    label: '🏗️ Infra & Fleets',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
};

const OEM_QUARRY_CITIES = [
  'hosur',
  'chennai',
  'coimbatore',
  'jamshedpur',
  'salem',
  'namakkal',
] as const;

const MINING_CITIES = [
  'dhanbad',
  'raipur',
  'bilaspur',
  'ranchi',
  'nagpur',
  'chandrapur',
  'angul',
  'asansol',
  'rourkela',
  'durgapur',
  'kolkata',
] as const;

const INFRA_CITIES = [
  'pune',
  'mumbai',
  'bengaluru',
  'bangalore',
  'hyderabad',
  'delhi',
  'new delhi',
  'ahmedabad',
  'surat',
  'ludhiana',
  'gurgaon',
  'gurugram',
] as const;

const MINING_REGIONS = new Set([
  'WB',
  'JH',
  'OD',
  'OR',
  'CG',
  'ORISSA',
  'ODISHA',
  'JHARKHAND',
  'WEST BENGAL',
  'CHHATTISGARH',
]);

const INFRA_REGIONS = new Set([
  'MH',
  'GJ',
  'TN',
  'PB',
  'DL',
  'HR',
  'MAHARASHTRA',
  'GUJARAT',
  'TAMIL NADU',
  'PUNJAB',
  'HARYANA',
]);

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compileHubPatterns(hubs: readonly string[]): RegExp[] {
  return hubs.map(
    (hub) => new RegExp(`(?:^|[\\s,(/])${escapeRegex(hub)}(?:$|[\\s,)/.-])`)
  );
}

const OEM_QUARRY_PATTERNS = compileHubPatterns(OEM_QUARRY_CITIES);
const MINING_PATTERNS = compileHubPatterns(MINING_CITIES);
const INFRA_PATTERNS = compileHubPatterns(INFRA_CITIES);

function normalizeGeoToken(value?: string | null): string {
  if (typeof value !== 'string') return '';
  let decoded = value;
  if (decoded.includes('%')) {
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      decoded = value;
    }
  }
  return decoded.replace(/\s+/g, ' ').trim();
}

/**
 * Canonical industrial cluster classifier (`BUG-13`).
 * Always resolves city-level hubs BEFORE state/region fallback so specific cities
 * (e.g. Jamshedpur/Chennai -> OEM & Quarry, Nagpur -> Mining Cluster, Hosur -> OEM & Quarry)
 * are never overridden by broader state/region buckets.
 */
export function getIndustrialCluster(
  city?: string | null,
  region?: string | null
): IndustrialClusterInfo | null {
  const c = normalizeGeoToken(city).toLowerCase();
  if (c) {
    if (OEM_QUARRY_PATTERNS.some((re) => re.test(c))) {
      return CLUSTER_CATALOG.oem_quarry;
    }
    if (MINING_PATTERNS.some((re) => re.test(c))) {
      return CLUSTER_CATALOG.mining;
    }
    if (INFRA_PATTERNS.some((re) => re.test(c))) {
      return CLUSTER_CATALOG.infra;
    }
  }

  const reg = normalizeGeoToken(region).toUpperCase();
  if (reg) {
    if (MINING_REGIONS.has(reg)) {
      return CLUSTER_CATALOG.mining;
    }
    if (INFRA_REGIONS.has(reg)) {
      return CLUSTER_CATALOG.infra;
    }
  }

  return null;
}

/**
 * Backward-compatible helper for Audience/Geo views (`{ name, icon, bg }`).
 */
export function getIndustrialClusterTag(
  cityName?: string | null,
  region?: string | null
): { name: string; icon: string; bg: string } | null {
  const cluster = getIndustrialCluster(cityName, region);
  if (!cluster) return null;
  return {
    name: cluster.name,
    icon: cluster.icon,
    bg: cluster.bg,
  };
}

/**
 * Backward-compatible helper for Visitor Directory badges (`{ label, bg }`).
 */
export function getIndustrialBadge(
  region?: string | null,
  city?: string | null
): { label: string; bg: string } | null {
  const cluster = getIndustrialCluster(city, region);
  if (!cluster) return null;
  return {
    label: cluster.label,
    bg: cluster.bg,
  };
}

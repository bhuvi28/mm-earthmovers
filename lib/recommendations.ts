import { Product } from './products';
import { getProductUrlSlug } from './utils';

// Subsystem taxonomy mapping for heavy machinery components
export const SUBSYSTEMS: Record<string, string[]> = {
  HYDRAULIC: ['SEAL KIT', 'SPOOL', 'PILOT', 'JOYSTICK', 'VALVE', 'CYLINDER', 'HYDRAULIC', 'MANIFOLD', 'PUMP'],
  TRANSMISSION: ['DISC', 'PLATE', 'GEAR', 'CLUTCH', 'TRANSMISSION', 'DRIVE', 'CHARGING PUMP', 'PROPELLER', 'SPINDLE', 'FLANGE', 'YOKE', 'AXLE', 'SOCKET', 'CAGE'],
  BRAKE: ['BRAKE', 'CAM', 'MASTER CYLINDER', 'PEDAL', 'AIR DRYER'],
  ENGINE_COOLING_EXHAUST: ['FILTER', 'FAN', 'SILENCER', 'MUFFLER', 'ENGINE', 'RADIATOR', 'AIR CLEANER'],
  CHASSIS_GET: ['TOOTH', 'POINT', 'PIN', 'KNUCKLE', 'BALL JOINT', 'HOUSING', 'REGULATOR']
};

export function getProductSubsystem(title: string): string {
  const t = title.toUpperCase();
  for (const [subsystem, keywords] of Object.entries(SUBSYSTEMS)) {
    if (keywords.some(k => t.includes(k))) return subsystem;
  }
  return 'OTHER';
}

export function parseBrandTokens(brand?: string | string[]): string[] {
  if (!brand) return [];
  if (Array.isArray(brand)) return brand.map(b => String(b).trim());
  return String(brand).split(/[,/]/).map(b => b.trim()).filter(Boolean);
}

// Deterministic string hash for SSR caching and even internal link distribution
function hashSlug(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i) | 0;
  }
  return Math.abs(hash);
}

export interface RecommendationResult {
  products: Product[];
  heading: string;
}

/**
 * Intelligent recommendation engine:
 * 1. Exact Machine Brand (+100)
 * 2. Machine Family Series (+50)
 * 3. Subsystem Functional Kit (+40)
 * 4. Image Quality (+10) & Part Number (+5)
 * 5. Deterministic tie-breaker (0-9) to evenly circulate PageRank across siblings
 */
export function getRelatedProducts(
  target: Product,
  allProducts: Product[],
  limit = 4
): RecommendationResult {
  const targetBrands = parseBrandTokens(target.brand);
  const targetSubsystem = getProductSubsystem(target.title);
  const targetSlug = getProductUrlSlug(target);
  const seed = hashSlug(target.slug);

  const scored = allProducts
    .filter(p => getProductUrlSlug(p) !== targetSlug && p.category === target.category)
    .map(p => {
      let score = 0;
      const pBrands = parseBrandTokens(p.brand);
      const pSubsystem = getProductSubsystem(p.title);

      // Exact Brand match
      const isExactBrand = targetBrands.some(tb =>
        pBrands.some(pb => pb.toLowerCase() === tb.toLowerCase())
      );
      if (isExactBrand) score += 100;

      // Brand family match (e.g. HM 2021 matches HM 2021 D)
      const isFamilyBrand = targetBrands.some(tb => {
        const coreTb = tb.replace(/[BDE]/gi, '').trim().toLowerCase();
        return pBrands.some(pb => pb.toLowerCase().includes(coreTb));
      });
      if (isFamilyBrand) score += 50;

      // Functional Subsystem Kit Affinity
      if (pSubsystem !== 'OTHER' && pSubsystem === targetSubsystem) {
        score += 40;
      }

      // Quality bonuses
      if (p.image && !p.image.includes('placeholder')) score += 10;
      if (p.part_number) score += 5;

      // Deterministic PageRank link circulation tie-breaker
      const tieBreaker = (hashSlug(p.slug) + seed) % 10;
      score += (tieBreaker * 0.1);

      return { product: p, score };
    });

  // Sort descending by affinity score
  scored.sort((a, b) => b.score - a.score);

  // Diversity filter: ensure no identical duplicate titles
  const selected: Product[] = [];
  const titlesSeen = new Set<string>();

  for (const item of scored) {
    const normTitle = item.product.title.trim().toUpperCase();
    if (!titlesSeen.has(normTitle)) {
      selected.push(item.product);
      titlesSeen.add(normTitle);
    }
    if (selected.length === limit) break;
  }

  // Fallback to fill remaining slots if needed
  if (selected.length < limit) {
    for (const item of scored) {
      if (!selected.some(s => getProductUrlSlug(s) === getProductUrlSlug(item.product))) {
        selected.push(item.product);
      }
      if (selected.length === limit) break;
    }
  }

  // Dynamic context-aware heading
  let heading = 'Similar Products';
  const primaryBrand = targetBrands.length > 0 ? targetBrands[0] : '';
  if (primaryBrand && selected.length > 0) {
    heading = `Other Compatible Parts for ${primaryBrand}`;
  } else if (target.category) {
    heading = `Similar ${target.category} Spare Parts`;
  }

  return { products: selected, heading };
}

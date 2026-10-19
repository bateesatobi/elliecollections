/** Lightweight storefront recommendations — views, wishlist, likes, category mix. */

import type { Product } from '../types';
import { loadWishlist } from './wishlist';

const VIEWED_KEY = 'ellie_recently_viewed_v1';
const MAX_VIEWED = 24;

function daySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** Deterministic shuffle so the page doesn’t jump on every re-render. */
export function seededShuffle<T>(items: T[], seed = daySeed()): T[] {
  const arr = [...items];
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function loadRecentlyViewed(): string[] {
  try {
    const raw = localStorage.getItem(VIEWED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function trackProductView(productId: string) {
  if (!productId || productId.startsWith('new_')) return;
  try {
    const prev = loadRecentlyViewed().filter((id) => id !== productId);
    const next = [productId, ...prev].slice(0, MAX_VIEWED);
    localStorage.setItem(VIEWED_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/**
 * Interleave by category (and kind) so “All products” doesn’t clump one niche.
 * Within each bucket, apply a seeded shuffle.
 */
export function diversifyByCategory(products: Product[], seed = daySeed()): Product[] {
  const buckets = new Map<string, Product[]>();
  for (const p of seededShuffle(products, seed)) {
    const key = `${p.kind}::${(p.category || 'other').toLowerCase()}`;
    const list = buckets.get(key) || [];
    list.push(p);
    buckets.set(key, list);
  }
  const queues = [...buckets.values()];
  const out: Product[] = [];
  let guard = 0;
  while (queues.some((q) => q.length) && guard < products.length + 5) {
    guard += 1;
    for (const q of queues) {
      if (q.length) out.push(q.shift()!);
    }
  }
  return out;
}

function scoreProduct(
  p: Product,
  ctx: {
    wishlist: Set<string>;
    viewed: string[];
    viewedCats: Set<string>;
    viewedKinds: Set<string>;
    excludeId?: string;
    boostCategory?: string;
    boostKind?: string;
  },
): number {
  if (!p.active) return -1e9;
  if (ctx.excludeId && p.id === ctx.excludeId) return -1e9;

  let score = 0;
  if (p.featured) score += 12;
  if (p.onPromotion || (p.discountPercent && p.discountPercent > 0)) score += 8;
  if (p.stock > 0) score += 6;
  else score -= 20;
  score += Math.min(18, (p.likesCount || 0) * 2);
  if (ctx.wishlist.has(p.id)) score += 22;
  const viewIdx = ctx.viewed.indexOf(p.id);
  if (viewIdx >= 0) score += Math.max(0, 16 - viewIdx);
  if (ctx.viewedCats.has((p.category || '').toLowerCase())) score += 10;
  if (ctx.viewedKinds.has(p.kind)) score += 5;
  if (
    ctx.boostCategory &&
    (p.category || '').toLowerCase() === ctx.boostCategory.toLowerCase()
  ) {
    score += 14;
  }
  if (ctx.boostKind && p.kind === ctx.boostKind) score += 8;
  // Mild novelty so we don’t only show the same 3 pieces
  score += (p.id.charCodeAt(0) + daySeed()) % 7;
  return score;
}

export function recommendProducts(
  catalog: Product[],
  opts: {
    limit?: number;
    excludeId?: string;
    seed?: number;
    boostCategory?: string;
    boostKind?: string;
  } = {},
): Product[] {
  const limit = opts.limit ?? 8;
  const viewed = loadRecentlyViewed();
  const wishlist = new Set(loadWishlist());
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const viewedProducts = viewed.map((id) => byId.get(id)).filter(Boolean) as Product[];
  const viewedCats = new Set(
    viewedProducts.map((p) => (p.category || '').toLowerCase()).filter(Boolean),
  );
  const viewedKinds = new Set(viewedProducts.map((p) => p.kind));
  if (opts.boostCategory) viewedCats.add(opts.boostCategory.toLowerCase());
  if (opts.boostKind) viewedKinds.add(opts.boostKind as Product['kind']);

  const scored = catalog
    .filter((p) => p.active)
    .map((p) => ({
      p,
      s: scoreProduct(p, {
        wishlist,
        viewed,
        viewedCats,
        viewedKinds,
        excludeId: opts.excludeId,
        boostCategory: opts.boostCategory,
        boostKind: opts.boostKind,
      }),
    }))
    .filter((x) => x.s > -1e8)
    .sort((a, b) => b.s - a.s);

  // Take a wider top pool, then diversify so apparel + accessories both appear
  const pool = scored.slice(0, Math.max(limit * 3, 12)).map((x) => x.p);
  return diversifyByCategory(pool, opts.seed ?? daySeed()).slice(0, limit);
}

/** Hero deal strip: mix of featured, promo, and high-like pieces across categories. */
export function heroSpotlight(catalog: Product[], limit = 5): Product[] {
  const active = catalog.filter((p) => p.active && p.stock > 0);
  const featured = active.filter((p) => p.featured);
  const promo = active.filter(
    (p) => p.onPromotion || (p.discountPercent && p.discountPercent > 0),
  );
  const liked = [...active].sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
  const blended = diversifyByCategory(
    seededShuffle([...featured, ...promo, ...liked.slice(0, 12)], daySeed() + 7),
    daySeed() + 11,
  );
  const unique: Product[] = [];
  const seen = new Set<string>();
  for (const p of blended) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    unique.push(p);
    if (unique.length >= limit) break;
  }
  if (unique.length < limit) {
    for (const p of diversifyByCategory(active)) {
      if (seen.has(p.id)) continue;
      unique.push(p);
      if (unique.length >= limit) break;
    }
  }
  return unique;
}

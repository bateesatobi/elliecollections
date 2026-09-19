/** Local wishlist for Elliecollections */

const WISHLIST_KEY = 'ellie_wishlist_v1';

export function loadWishlist(): string[] {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function saveWishlist(ids: string[]) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
}

export function toggleWishlist(productId: string): string[] {
  const ids = loadWishlist();
  const next = ids.includes(productId) ? ids.filter((id) => id !== productId) : [...ids, productId];
  saveWishlist(next);
  return next;
}

export function isInWishlist(productId: string): boolean {
  return loadWishlist().includes(productId);
}

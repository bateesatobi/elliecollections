/** Local wishlist + sync likes to the API for storefront counts. */

import { marketApi } from '../services/api';
import { processLabel } from './processCatalog';
import { runProcess } from './processProgress';

const WISHLIST_KEY = 'ellie_wishlist_v1';
const VISITOR_KEY = 'ellie_visitor_v1';

export function getVisitorKey(): string {
  try {
    let key = localStorage.getItem(VISITOR_KEY);
    if (!key || key.length < 8) {
      key =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(VISITOR_KEY, key);
    }
    return key;
  } catch {
    return `v_${Date.now().toString(36)}`;
  }
}

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

/** Toggle local wishlist and sync like count to the API. */
export async function toggleWishlistAndSync(
  productId: string,
  currentLikes = 0,
): Promise<{ ids: string[]; liked: boolean; likesCount: number }> {
  const wasLiked = isInWishlist(productId);
  const liked = !wasLiked;
  const ids = toggleWishlist(productId);
  const optimistic = Math.max(0, currentLikes + (liked ? 1 : -1));

  try {
    return await runProcess(
      {
        kind: 'update',
        title: processLabel('client.like', 'Updating wishlist…'),
        mode: 'bar',
        percent: 35,
      },
      async (set) => {
        set(65, liked ? 'Saving like…' : 'Removing like…');
        const res = await marketApi.setProductLike(productId, getVisitorKey(), liked);
        const local = loadWishlist();
        if (res.liked && !local.includes(productId)) saveWishlist([...local, productId]);
        if (!res.liked && local.includes(productId)) {
          saveWishlist(local.filter((id) => id !== productId));
        }
        return { ids: loadWishlist(), liked: res.liked, likesCount: res.likesCount };
      },
    );
  } catch {
    return { ids, liked, likesCount: optimistic };
  }
}

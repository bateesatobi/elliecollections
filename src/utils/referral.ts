/** Capture & share Elliecollections referral / product links */

const REF_KEY = 'ellie_referral_code';

export function captureReferralFromUrl(search: string = window.location.search) {
  const params = new URLSearchParams(search);
  const ref = (params.get('ref') || '').trim().toUpperCase();
  if (ref) {
    localStorage.setItem(REF_KEY, ref);
  }
  return getStoredReferral();
}

export function getStoredReferral(): string | null {
  return localStorage.getItem(REF_KEY);
}

export function clearStoredReferral() {
  localStorage.removeItem(REF_KEY);
}

export function buildProductShareUrl(productId: string, referralCode?: string | null) {
  const url = new URL(`/product/${productId}`, window.location.origin);
  if (referralCode) url.searchParams.set('ref', referralCode);
  return url.toString();
}

export function buildShopShareUrl(referralCode?: string | null) {
  const url = new URL('/shop', window.location.origin);
  if (referralCode) url.searchParams.set('ref', referralCode);
  return url.toString();
}

export async function shareOrCopy(opts: {
  title: string;
  text: string;
  url: string;
}): Promise<'shared' | 'copied'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: opts.title, text: opts.text, url: opts.url });
      return 'shared';
    } catch {
      // fall through to clipboard
    }
  }
  await navigator.clipboard.writeText(opts.url);
  return 'copied';
}

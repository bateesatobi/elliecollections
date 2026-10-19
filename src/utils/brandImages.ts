/**
 * Static storefront / marketing imagery — African women fashion & East Africa context.
 * Sourced from Unsplash (free license); Lagos / Kampala / Mombasa shoots, visually verified.
 */

const u = (id: string, w: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

/** Home hero + OG / SEO — Lagos runway, African model in orange gown */
export const BRAND_HERO = u('photo-1733322986999-2ce54a7c6d0d', 1600);

/** Apparel department tile — Nigerian woman in elegant African fashion */
export const BRAND_APPAREL = u('photo-1745669702821-b994a8b9ad78', 900);

/** Accessories tile — Kampala beauty with earrings (Uganda) */
export const BRAND_ACCESSORIES = u('photo-1677739411898-7929bc8c946f', 900);

/** Customer sign-in visual — Black woman in black dress, Mombasa, Kenya */
export const BRAND_SIGNIN = u('photo-1758116921606-b628f2055cf5', 1400);

/** Admin login visual — African woman in gele / formal attire */
export const BRAND_ADMIN_LOGIN = u('photo-1687052093309-7a14efa58ecb', 1400);

/** Catalogue demo apparel (African models) */
export const SEED_IMG = {
  dress: u('photo-1698527692282-fc5d8ab13771', 800),
  blouse: u('photo-1677739411898-7929bc8c946f', 800),
  trousers: u('photo-1589156280159-27698a70f29e', 800),
  coord: u('photo-1745669702821-b994a8b9ad78', 800),
  /** Product-only shots — no models */
  bag: u('photo-1584917865442-de89df76afd3', 800),
  jewelry: u('photo-1599643478518-a784e5dc4c8f', 800),
  heels: u('photo-1543163521-1bf539c55dd2', 800),
  beauty: u('photo-1586495777744-4413f2103256', 800),
} as const;

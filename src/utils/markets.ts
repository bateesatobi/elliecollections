/** East Africa ship-to markets (Walmart-style: region/country, not city). */

export type MarketCountry = {
  code: string;
  name: string;
  flag: string;
};

/** Countries we fulfill across — no city / shop pin on product cards. */
export const EAST_AFRICA_MARKETS: MarketCountry[] = [
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'SS', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'CD', name: 'DR Congo', flag: '🇨🇩' },
];

const BY_CODE = new Map(EAST_AFRICA_MARKETS.map((m) => [m.code, m]));
const BY_NAME = new Map(
  EAST_AFRICA_MARKETS.flatMap((m) => [
    [m.name.toLowerCase(), m],
    [m.code.toLowerCase(), m],
  ]),
);

/** Default: ships to every East Africa market we support. */
export const DEFAULT_SHIP_TO_CODES = EAST_AFRICA_MARKETS.map((m) => m.code);

export function parseShipToCodes(location: string | undefined | null): string[] {
  const raw = (location || '').trim();
  if (!raw) return [...DEFAULT_SHIP_TO_CODES];

  const parts = raw
    .split(/[,|/·•]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const codes: string[] = [];
  for (const part of parts) {
    const lower = part.toLowerCase();
    // Legacy city pins → treat as Uganda (HQ) then expand via caller if needed
    if (
      /kampala|kololo|entebbe|ntinda|jinja|mbarara|gulu/.test(lower) ||
      lower === 'uganda'
    ) {
      if (!codes.includes('UG')) codes.push('UG');
      continue;
    }
    const hit =
      BY_NAME.get(lower) ||
      BY_CODE.get(part.toUpperCase()) ||
      EAST_AFRICA_MARKETS.find((m) => lower.includes(m.name.toLowerCase()));
    if (hit && !codes.includes(hit.code)) codes.push(hit.code);
  }

  // Old “Kampala-only” catalogue entries should still sell region-wide
  if (codes.length === 1 && codes[0] === 'UG' && /kampala|kololo/i.test(raw)) {
    return [...DEFAULT_SHIP_TO_CODES];
  }

  return codes.length ? codes : [...DEFAULT_SHIP_TO_CODES];
}

export function encodeShipToCodes(codes: string[]): string {
  const ordered = EAST_AFRICA_MARKETS.filter((m) => codes.includes(m.code)).map(
    (m) => m.name,
  );
  return ordered.join(', ') || EAST_AFRICA_MARKETS.map((m) => m.name).join(', ');
}

export function shipToLabel(location: string | undefined | null): string {
  const codes = parseShipToCodes(location);
  if (codes.length >= EAST_AFRICA_MARKETS.length) {
    return 'Ships across East Africa';
  }
  const names = EAST_AFRICA_MARKETS.filter((m) => codes.includes(m.code)).map(
    (m) => `${m.flag} ${m.name}`,
  );
  return names.length ? `Ships to ${names.join(' · ')}` : 'Ships across East Africa';
}

export function shipToShort(location: string | undefined | null): string {
  const codes = parseShipToCodes(location);
  if (codes.length >= EAST_AFRICA_MARKETS.length) return 'East Africa';
  return EAST_AFRICA_MARKETS.filter((m) => codes.includes(m.code))
    .map((m) => m.name)
    .join(', ');
}

export function productShipsToCountry(
  location: string | undefined | null,
  countryCode: string,
): boolean {
  const codes = parseShipToCodes(location);
  return codes.includes(countryCode.toUpperCase());
}

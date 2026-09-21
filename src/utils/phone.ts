/** East Africa (+ regional) phone helpers for Elliecollections. */

export type PhoneCountry = {
  iso: string;
  name: string;
  dial: string; // digits only, no +
  flag: string;
  /** Typical national length after dropping leading 0 */
  nationalLen: number;
};

/** Countries we sell to / accept numbers from (aligned with currency markets). */
export const PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'UG', name: 'Uganda', dial: '256', flag: '🇺🇬', nationalLen: 9 },
  { iso: 'KE', name: 'Kenya', dial: '254', flag: '🇰🇪', nationalLen: 9 },
  { iso: 'TZ', name: 'Tanzania', dial: '255', flag: '🇹🇿', nationalLen: 9 },
  { iso: 'RW', name: 'Rwanda', dial: '250', flag: '🇷🇼', nationalLen: 9 },
  { iso: 'SS', name: 'South Sudan', dial: '211', flag: '🇸🇸', nationalLen: 9 },
  { iso: 'CD', name: 'DR Congo', dial: '243', flag: '🇨🇩', nationalLen: 9 },
];

const DIAL_BY_ISO = Object.fromEntries(PHONE_COUNTRIES.map((c) => [c.iso, c]));

export function digitsOnly(value: string) {
  return (value || '').replace(/\D/g, '');
}

export function phoneCountryFromIso(iso?: string | null): PhoneCountry {
  return DIAL_BY_ISO[(iso || 'UG').toUpperCase()] || PHONE_COUNTRIES[0];
}

export function detectPhoneCountry(phone: string, fallbackIso = 'UG'): PhoneCountry {
  const digits = digitsOnly(phone);
  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (digits.startsWith(c.dial) && digits.length >= c.dial.length + 7) return c;
  }
  return phoneCountryFromIso(fallbackIso);
}

/**
 * Normalize to E.164 digits without "+".
 * Examples: "0746157039" + UG → "256746157039"; "+254712345678" → "254712345678"
 */
export function normalizeE164(phone: string, defaultIso = 'UG'): string {
  let digits = digitsOnly(phone);
  if (!digits) return '';

  const sorted = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (digits.startsWith(c.dial)) {
      const rest = digits.slice(c.dial.length);
      if (rest.startsWith('0')) digits = c.dial + rest.slice(1);
      return digits;
    }
  }

  const country = phoneCountryFromIso(defaultIso);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length >= 7 && digits.length <= country.nationalLen + 1) {
    return country.dial + digits;
  }
  return country.dial + digits;
}

/** Last 9 digits — used to match the same handset across 07… vs +256… forms. */
export function phoneMatchKey(phone: string, defaultIso = 'UG'): string {
  const e164 = normalizeE164(phone, defaultIso);
  return e164.slice(-9);
}

export function formatPhoneDisplay(phone: string, defaultIso = 'UG'): string {
  const e164 = normalizeE164(phone, defaultIso);
  if (!e164) return '';
  const country = detectPhoneCountry(e164, defaultIso);
  const national = e164.slice(country.dial.length);
  return `+${country.dial} ${national}`;
}

export function validateMobilePhone(phone: string, defaultIso = 'UG'): string | null {
  const e164 = normalizeE164(phone, defaultIso);
  if (!e164) return 'Enter a mobile number.';
  const country = detectPhoneCountry(e164, defaultIso);
  const national = e164.slice(country.dial.length);
  if (national.length < 8 || national.length > 10) {
    return `Enter a valid ${country.name} mobile (e.g. +${country.dial} 7XX XXX XXX).`;
  }
  if (!PHONE_COUNTRIES.some((c) => e164.startsWith(c.dial))) {
    return 'Use a supported country code (UG, KE, TZ, RW, SS, CD).';
  }
  return null;
}

/** Split stored value into iso + national digits (no leading 0) for the input UI. */
export function splitPhoneInput(phone: string, fallbackIso = 'UG'): { iso: string; national: string } {
  const digits = digitsOnly(phone);
  if (!digits) return { iso: fallbackIso, national: '' };
  const country = detectPhoneCountry(digits, fallbackIso);
  if (digits.startsWith(country.dial)) {
    return { iso: country.iso, national: digits.slice(country.dial.length).replace(/^0+/, '') };
  }
  if (digits.startsWith('0')) {
    return { iso: fallbackIso, national: digits.slice(1) };
  }
  return { iso: fallbackIso, national: digits };
}

export function joinPhoneInput(iso: string, national: string): string {
  const country = phoneCountryFromIso(iso);
  const n = digitsOnly(national).replace(/^0+/, '');
  if (!n) return '';
  return `+${country.dial}${n}`;
}

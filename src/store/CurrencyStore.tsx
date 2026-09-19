import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getApiUrl } from '../services/api';

export type FxRate = {
  code: string;
  name: string;
  symbol: string;
  country: string;
  ugxPerUnit: number;
  flag: string;
};

type CurrencyContextValue = {
  rates: FxRate[];
  currency: FxRate;
  setCurrencyCode: (code: string) => void;
  formatMoney: (amountUgx: number) => string;
  convertFromUgx: (amountUgx: number) => number;
  loading: boolean;
  detectedCountry: string | null;
  autoDetected: boolean;
};

const STORAGE_KEY = 'ellie_currency_code';
const MANUAL_KEY = 'ellie_currency_manual';

/** ISO country code → currency code we support */
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  UG: 'UGX',
  KE: 'KES',
  TZ: 'TZS',
  RW: 'RWF',
  SS: 'SSP',
  CD: 'CDF', // DR Congo
  CG: 'CDF', // Congo-Brazzaville → nearest supported
  US: 'USD',
  GB: 'GBP',
  AE: 'AED',
  ZA: 'ZAR',
  NG: 'NGN',
  // Eurozone / common EUR countries
  AT: 'EUR',
  BE: 'EUR',
  CY: 'EUR',
  DE: 'EUR',
  EE: 'EUR',
  ES: 'EUR',
  FI: 'EUR',
  FR: 'EUR',
  GR: 'EUR',
  IE: 'EUR',
  IT: 'EUR',
  LT: 'EUR',
  LU: 'EUR',
  LV: 'EUR',
  MT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  SI: 'EUR',
  SK: 'EUR',
};

const FALLBACK: FxRate[] = [
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'UGX', country: 'Uganda', ugxPerUnit: 1, flag: '🇺🇬' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', country: 'Kenya', ugxPerUnit: 28, flag: '🇰🇪' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', country: 'Tanzania', ugxPerUnit: 1.4, flag: '🇹🇿' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RF', country: 'Rwanda', ugxPerUnit: 2.5, flag: '🇷🇼' },
  { code: 'SSP', name: 'South Sudanese Pound', symbol: 'SSP', country: 'South Sudan', ugxPerUnit: 0.67, flag: '🇸🇸' },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'FC', country: 'DR Congo', ugxPerUnit: 1.3, flag: '🇨🇩' },
  { code: 'USD', name: 'US Dollar', symbol: '$', country: 'United States', ugxPerUnit: 3700, flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', symbol: '€', country: 'Eurozone', ugxPerUnit: 4000, flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', symbol: '£', country: 'United Kingdom', ugxPerUnit: 4700, flag: '🇬🇧' },
];

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function pickSupported(rates: FxRate[], code: string | null | undefined): string | null {
  if (!code) return null;
  return rates.some((r) => r.code === code) ? code : null;
}

function detectFromTimezoneAndLocale(rates: FxRate[]): string | null {
  const lang = (navigator.language || '').toLowerCase();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const hints: Array<[RegExp, string]> = [
    [/uganda|kampala/i, 'UGX'],
    [/nairobi|kenya/i, 'KES'],
    [/dar_es_salaam|tanzania/i, 'TZS'],
    [/kigali|rwanda/i, 'RWF'],
    [/juba|south_sudan|south-sudan/i, 'SSP'],
    [/kinshasa|lubumbashi|congo/i, 'CDF'],
    [/lagos|nigeria/i, 'NGN'],
    [/johannesburg|africa\/johannesburg/i, 'ZAR'],
    [/dubai|abu_dhabi/i, 'AED'],
    [/london|europe\/london/i, 'GBP'],
    [/europe\//i, 'EUR'],
    [/america\//i, 'USD'],
  ];
  for (const [re, code] of hints) {
    if ((re.test(tz) || re.test(lang)) && rates.some((r) => r.code === code)) return code;
  }
  if (lang.includes('en-us')) return pickSupported(rates, 'USD');
  if (lang.includes('en-gb')) return pickSupported(rates, 'GBP');
  return null;
}

function currencyFromCountryCode(rates: FxRate[], countryCode: string | null): string | null {
  if (!countryCode) return null;
  const iso = countryCode.trim().toUpperCase();
  return pickSupported(rates, COUNTRY_TO_CURRENCY[iso] || null);
}

async function fetchWithTimeout(url: string, ms = 4500): Promise<Response> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

/** Resolve visitor country via IP geolocation (CORS-friendly public APIs). */
async function detectCountryFromIp(): Promise<string | null> {
  const controllers: Array<() => Promise<string | null>> = [
    async () => {
      const res = await fetchWithTimeout('https://countries.dev/ip');
      if (!res.ok) return null;
      const data = await res.json();
      return (
        data?.country?.alpha2Code ||
        data?.country?.cca2 ||
        data?.country?.code ||
        data?.alpha2Code ||
        null
      );
    },
    async () => {
      const res = await fetchWithTimeout('https://ipapi.co/json/');
      if (!res.ok) return null;
      const data = await res.json();
      return data?.country_code || null;
    },
    async () => {
      const res = await fetchWithTimeout('https://ipwho.is/');
      if (!res.ok) return null;
      const data = await res.json();
      return data?.success === false ? null : data?.country_code || null;
    },
  ];

  for (const run of controllers) {
    try {
      const code = await run();
      if (typeof code === 'string' && /^[A-Za-z]{2}$/.test(code)) {
        return code.toUpperCase();
      }
    } catch {
      /* try next provider */
    }
  }
  return null;
}

async function resolveAutoCurrency(rates: FxRate[]): Promise<{
  currencyCode: string;
  countryCode: string | null;
}> {
  const countryCode = await detectCountryFromIp();
  const fromIp = currencyFromCountryCode(rates, countryCode);
  if (fromIp) return { currencyCode: fromIp, countryCode };

  const fromTz = detectFromTimezoneAndLocale(rates);
  if (fromTz) return { currencyCode: fromTz, countryCode };

  return { currencyCode: 'UGX', countryCode };
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [rates, setRates] = useState<FxRate[]>(FALLBACK);
  const [code, setCode] = useState('UGX');
  const [loading, setLoading] = useState(true);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [autoDetected, setAutoDetected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let activeRates = FALLBACK;
      try {
        const res = await fetch(`${getApiUrl()}/market/fx-rates`);
        if (res.ok) {
          const data = await res.json();
          const mapped: FxRate[] = (data.rates || []).map(
            (r: {
              code: string;
              name: string;
              symbol: string;
              country: string;
              ugx_per_unit: number;
              flag?: string;
            }) => ({
              code: r.code,
              name: r.name,
              symbol: r.symbol,
              country: r.country,
              ugxPerUnit: Number(r.ugx_per_unit) || 1,
              flag: r.flag || '',
            }),
          );
          if (mapped.length) activeRates = mapped;
        }
      } catch {
        /* use fallback rates */
      }

      if (cancelled) return;
      setRates(activeRates);

      const manual = localStorage.getItem(MANUAL_KEY) === '1';
      const saved = localStorage.getItem(STORAGE_KEY);

      if (manual && saved && activeRates.some((r) => r.code === saved)) {
        setCode(saved);
        setAutoDetected(false);
        setLoading(false);
        // Still detect country in background for display, without overriding
        void detectCountryFromIp().then((c) => {
          if (!cancelled && c) setDetectedCountry(c);
        });
        return;
      }

      const resolved = await resolveAutoCurrency(activeRates);
      if (cancelled) return;

      setDetectedCountry(resolved.countryCode);
      setCode(resolved.currencyCode);
      localStorage.setItem(STORAGE_KEY, resolved.currencyCode);
      localStorage.removeItem(MANUAL_KEY);
      setAutoDetected(true);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setCurrencyCode = useCallback((next: string) => {
    setCode(next);
    localStorage.setItem(STORAGE_KEY, next);
    localStorage.setItem(MANUAL_KEY, '1');
    setAutoDetected(false);
  }, []);

  const currency = useMemo(
    () => rates.find((r) => r.code === code) || rates[0] || FALLBACK[0],
    [rates, code],
  );

  const convertFromUgx = useCallback(
    (amountUgx: number) => {
      const rate = currency.ugxPerUnit || 1;
      return amountUgx / rate;
    },
    [currency],
  );

  const formatMoney = useCallback(
    (amountUgx: number) => {
      const converted = convertFromUgx(amountUgx);
      if (currency.code === 'UGX') {
        return `UGX ${Math.round(converted).toLocaleString()}`;
      }
      const rounded =
        converted >= 100 ? Math.round(converted) : Math.round(converted * 100) / 100;
      return `${currency.symbol} ${rounded.toLocaleString(undefined, {
        minimumFractionDigits: converted < 100 && currency.code !== 'UGX' ? 2 : 0,
        maximumFractionDigits: 2,
      })}`;
    },
    [convertFromUgx, currency],
  );

  const value: CurrencyContextValue = {
    rates,
    currency,
    setCurrencyCode,
    formatMoney,
    convertFromUgx,
    loading,
    detectedCountry,
    autoDetected,
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

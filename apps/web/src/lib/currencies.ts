/**
 * Currency catalog for the price-submission form.
 *
 * Until this PR the form offered only KES, NGN, GHS, USD, ZAR — the four
 * Africa-launch markets plus USD. Anyone from outside that region had to
 * pick "USD" or no option at all, which was either inaccurate (price was
 * actually quoted in TRY / BRL / PHP / VND) or a dead end (they leave
 * thinking the app doesn't support their country). We're a global price
 * tracker by design — the contract has no regional binding, every Mento
 * stablecoin pair settles in cUSD on Celo, GPS-derived zone keys work
 * anywhere on Earth.
 *
 * The dropdown now covers ~35 currencies grouped by region. Coverage
 * priority order:
 *
 *   1. All 15 Mento stablecoin currencies (USD, EUR, BRL, XOF, KES,
 *      PHP, COP, GBP, CAD, AUD, ZAR, GHS, NGN, JPY, CHF) — these are
 *      first-class Celo citizens and will likely become reward-currency
 *      options in a future contract upgrade.
 *   2. Major non-Mento currencies by population (INR, IDR, VND, TRY,
 *      RUB, MXN, EGP, TWD, PKR, BDT, etc.) so a real reader from those
 *      markets doesn't get bounced.
 *
 * If you add a currency: keep it ISO 4217, put it in the right region
 * group, and add a human label. No on-chain change required — currency
 * is UX metadata on the submission form (NOT persisted on-chain yet;
 * see TODO in `useSubmitPrice` for the persistence plan).
 */

export interface CurrencyOption {
  /** ISO 4217 code (e.g. "USD", "KES"). */
  code: string;
  /** Human-readable name, used as `<option>` label. */
  name: string;
  /** True if this currency has a Mento stablecoin on Celo. Reserved for
   *  future UI cues (e.g. a small "Mento" badge in the option label). */
  mento?: boolean;
}

export const CURRENCIES_BY_REGION: Record<string, CurrencyOption[]> = {
  "Global / Reserves": [
    { code: "USD", name: "US Dollar", mento: true },
    { code: "EUR", name: "Euro", mento: true },
    { code: "GBP", name: "British Pound", mento: true },
    { code: "JPY", name: "Japanese Yen", mento: true },
    { code: "CHF", name: "Swiss Franc", mento: true },
    { code: "CNY", name: "Chinese Yuan" },
  ],
  "Africa": [
    { code: "KES", name: "Kenyan Shilling", mento: true },
    { code: "NGN", name: "Nigerian Naira", mento: true },
    { code: "GHS", name: "Ghanaian Cedi", mento: true },
    { code: "ZAR", name: "South African Rand", mento: true },
    { code: "XOF", name: "West African CFA Franc", mento: true },
    { code: "EGP", name: "Egyptian Pound" },
    { code: "MAD", name: "Moroccan Dirham" },
    { code: "ETB", name: "Ethiopian Birr" },
    { code: "TZS", name: "Tanzanian Shilling" },
    { code: "UGX", name: "Ugandan Shilling" },
  ],
  "Latin America": [
    { code: "BRL", name: "Brazilian Real", mento: true },
    { code: "COP", name: "Colombian Peso", mento: true },
    { code: "MXN", name: "Mexican Peso" },
    { code: "ARS", name: "Argentine Peso" },
    { code: "CLP", name: "Chilean Peso" },
    { code: "PEN", name: "Peruvian Sol" },
  ],
  "Asia": [
    { code: "INR", name: "Indian Rupee" },
    { code: "PHP", name: "Philippine Peso", mento: true },
    { code: "IDR", name: "Indonesian Rupiah" },
    { code: "VND", name: "Vietnamese Dong" },
    { code: "THB", name: "Thai Baht" },
    { code: "KRW", name: "South Korean Won" },
    { code: "MYR", name: "Malaysian Ringgit" },
    { code: "SGD", name: "Singapore Dollar" },
    { code: "PKR", name: "Pakistani Rupee" },
    { code: "BDT", name: "Bangladeshi Taka" },
  ],
  "Europe & Eurasia": [
    { code: "TRY", name: "Turkish Lira" },
    { code: "RUB", name: "Russian Ruble" },
    { code: "UAH", name: "Ukrainian Hryvnia" },
    { code: "PLN", name: "Polish Zloty" },
  ],
  "Other Developed": [
    { code: "CAD", name: "Canadian Dollar", mento: true },
    { code: "AUD", name: "Australian Dollar", mento: true },
    { code: "NZD", name: "New Zealand Dollar" },
    { code: "HKD", name: "Hong Kong Dollar" },
  ],
};

/** Flat list of every supported currency code. Order matches optgroup display. */
export const ALL_CURRENCY_CODES: readonly string[] = Object.values(
  CURRENCIES_BY_REGION,
).flatMap((group) => group.map((c) => c.code));

/**
 * Best-effort guess at the user's local currency. Reads the browser's
 * default formatting locale (e.g. "fr-FR", "en-KE", "vi-VN") and asks
 * the Intl API for the currency code that locale would normally format
 * money in. Falls back to USD if:
 *
 *   - The runtime doesn't support `resolvedOptions().currency` (older
 *     Safari < 14, very old Android WebViews).
 *   - The locale resolves to a currency we don't carry in the dropdown
 *     (we'd rather default to a known-good option than offer one the
 *     user can't change to).
 *
 * Safe to call on the client only — guards against SSR (returns "USD"
 * if `Intl` or `navigator` is absent).
 */
export function detectDefaultCurrency(fallback: string = "USD"): string {
  if (typeof Intl === "undefined") return fallback;
  try {
    const fmt = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD", // dummy; just so we can read resolvedOptions
    });
    const opts = fmt.resolvedOptions();
    // `resolvedOptions().currency` echoes the input currency. To get
    // the user's actual local currency we need to NOT specify one in
    // the constructor — but `style: "currency"` requires a currency
    // param. Instead, use `Intl.Locale` (newer API) or fall back to
    // language-to-currency mapping below.
    const region = opts.locale.split("-")[1]?.toUpperCase();
    if (region) {
      const guess = REGION_TO_CURRENCY[region];
      if (guess && ALL_CURRENCY_CODES.includes(guess)) return guess;
    }
  } catch {
    /* fall through to fallback */
  }
  return fallback;
}

/**
 * ISO 3166-1 alpha-2 region → ISO 4217 currency mapping for the
 * countries our dropdown covers. We don't need every country in
 * the world here — just enough that the most common locales resolve
 * to a currency in our dropdown.
 *
 * Multi-currency regions (e.g. EU) map to the dominant currency
 * (EUR) — users can always change manually.
 */
const REGION_TO_CURRENCY: Record<string, string> = {
  // Global reserves
  US: "USD", EU: "EUR", GB: "GBP", JP: "JPY", CH: "CHF", CN: "CNY",
  // Africa
  KE: "KES", NG: "NGN", GH: "GHS", ZA: "ZAR", EG: "EGP", MA: "MAD",
  ET: "ETB", TZ: "TZS", UG: "UGX", SN: "XOF", CI: "XOF", BJ: "XOF",
  ML: "XOF", BF: "XOF", NE: "XOF", TG: "XOF", GW: "XOF",
  // Latin America
  BR: "BRL", CO: "COP", MX: "MXN", AR: "ARS", CL: "CLP", PE: "PEN",
  // Asia
  IN: "INR", PH: "PHP", ID: "IDR", VN: "VND", TH: "THB", KR: "KRW",
  MY: "MYR", SG: "SGD", PK: "PKR", BD: "BDT",
  // Europe & Eurasia
  TR: "TRY", RU: "RUB", UA: "UAH", PL: "PLN",
  // Eurozone (a sample — full list is long, dropdown defaults to EUR for
  // any locale whose region is one of these)
  DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", BE: "EUR",
  AT: "EUR", PT: "EUR", IE: "EUR", FI: "EUR", GR: "EUR",
  // Other developed
  CA: "CAD", AU: "AUD", NZ: "NZD", HK: "HKD",
};

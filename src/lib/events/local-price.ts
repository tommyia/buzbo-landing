// The estimate next to a ticket's price, for a visitor in another currency. Pure, so it
// can be tested without the Workers runtime. Display only: buzbo-be charges the ticket's
// own price and Airwallex converts at its own rate.

/** Countries whose currency the editor in buzbo-event offers a rate for (FX_CURRENCIES). */
const COUNTRY_CURRENCY: Record<string, string> = {
  GB: 'GBP',
  IM: 'GBP',
  JE: 'GBP',
  GG: 'GBP',
  US: 'USD',
  CH: 'CHF',
  LI: 'CHF',
  SE: 'SEK',
  NO: 'NOK',
  DK: 'DKK',
  PL: 'PLN',
  SG: 'SGD',
  AU: 'AUD',
  CA: 'CAD',
  ID: 'IDR',
  MY: 'MYR',
  JP: 'JPY',
};

/** Cloudflare's country for the visitor. `?country=GB` overrides it, to test from anywhere;
 *  that is safe because it only changes the estimate. */
export function visitorCountry(headers: Headers, params: URLSearchParams): string | null {
  const country = (params.get('country') ?? headers.get('cf-ipcountry') ?? '').toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : null;
}

/** "≈ £8.70". Null for a free ticket, a visitor already in the ticket's currency, or a
 *  currency this event has no rate for. */
export function localPriceEstimate(
  cents: number,
  ticketCurrency: string,
  rates: Record<string, number> | null,
  country: string | null,
): string | null {
  const currency = country ? COUNTRY_CURRENCY[country] : undefined;
  if (!currency || currency === ticketCurrency || cents <= 0) return null;
  const rate = rates?.[currency];
  if (typeof rate !== 'number' || !(rate > 0)) return null;
  const amount = (cents / 100) * rate;
  const formatted = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    // Rp 185,000.00 says more than anyone can know from an estimate.
    ...(amount >= 1000 ? { maximumFractionDigits: 0 } : {}),
  }).format(amount);
  return `≈ ${formatted.replace(/ /g, ' ')}`;
}

// What the browser does with buzbo-be's answer to a checkout. Pure, so it is tested
// without a browser; the event page's script only gathers the form and calls this.

export type CheckoutAnswer = {
  order_url?: string;
  intent_id?: string;
  client_secret?: string;
  currency?: string;
  env?: string;
};

export type NextStep =
  | { kind: 'redirect'; url: string }
  | { kind: 'airwallex'; options: Record<string, string> };

export function checkoutLabel(priceCents: number): 'Buy ticket' | 'Register' {
  return priceCents > 0 ? 'Buy ticket' : 'Register';
}

/** The order page must be on the site the buyer is on: the address comes from a server
 *  answer and ends up in `location.href`. */
function sameSiteUrl(value: string | undefined, here: string): string {
  try {
    const url = new URL(value ?? '');
    if (url.protocol === 'https:' || url.protocol === 'http:') {
      if (url.origin === new URL(here).origin) return url.href;
    }
  } catch {
    // falls through
  }
  throw new Error('The order page address was not recognised. Nothing was charged.');
}

export function nextStep(data: CheckoutAnswer, here: string): NextStep {
  const orderUrl = sameSiteUrl(data.order_url, here);
  if (!data.intent_id || !data.client_secret || !data.currency || !data.env) {
    return { kind: 'redirect', url: orderUrl };
  }
  return {
    kind: 'airwallex',
    options: {
      env: data.env,
      mode: 'payment',
      intent_id: data.intent_id,
      client_secret: data.client_secret,
      currency: data.currency,
      // Events are in the Netherlands; without it Airwallex guesses from the IP.
      country_code: 'NL',
      successUrl: orderUrl,
      cancelUrl: here,
    },
  };
}

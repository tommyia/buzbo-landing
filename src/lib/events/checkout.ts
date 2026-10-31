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

export type BuddyInput = { name: string; email: string; confirmEmail: string; emailValid: boolean };

/** Why these buddies cannot be sent, or null when they can. A row is filled in whole or
 *  taken away; everyone needs their own address, since one email holds one ticket. */
export function buddyRefusal(buddies: BuddyInput[], buyerEmail: string): string | null {
  const seen = new Set([buyerEmail.trim().toLowerCase()]);
  for (const [index, buddy] of buddies.entries()) {
    const who = buddies.length > 1 ? `buddy ${index + 1}` : 'your buddy';
    if (!buddy.name.trim()) return `Enter the name of ${who}, or remove them.`;
    const email = buddy.email.trim().toLowerCase();
    if (!email || !buddy.emailValid) return `Enter a valid email address for ${who}.`;
    const confirm = buddy.confirmEmail.trim().toLowerCase();
    if (!confirm) return `Type the email address of ${who} again to confirm it.`;
    if (confirm !== email) return `The email addresses of ${who} do not match.`;
    if (seen.has(email)) return `Everyone needs their own email address: ${email} is used twice.`;
    seen.add(email);
  }
  return null;
}

/** Why the checkout form cannot be sent yet, or null when it can. `emailValid` is the
 *  browser's own check of the email field. The confirmation catches a typo before the
 *  ticket goes to an address nobody reads. */
export function checkoutRefusal(form: {
  name: string;
  email: string;
  confirmEmail: string;
  emailValid: boolean;
}): string | null {
  if (!form.name.trim()) return 'Enter your name.';
  const email = form.email.trim().toLowerCase();
  if (!email || !form.emailValid) return 'Enter a valid email address.';
  const confirm = form.confirmEmail.trim().toLowerCase();
  if (!confirm) return 'Type your email address again to confirm it.';
  if (confirm !== email) return 'The email addresses do not match.';
  return null;
}

/** The order page's address ON THE SITE THE BUYER IS ON. buzbo-be builds the link from
 *  its own idea of the site's address; the buyer may be on www, or on a preview. So only
 *  the path is taken from the answer — which also means the answer cannot send anyone to
 *  another site, whatever it says. */
function orderPageUrl(value: string | undefined, here: string): string {
  try {
    const url = new URL(value ?? '');
    const isWeb = url.protocol === 'https:' || url.protocol === 'http:';
    // A path of "//host/…" would be read as another site when joined to an origin.
    if (isWeb && url.pathname.length > 1 && !url.pathname.startsWith('//')) {
      return `${new URL(here).origin}${url.pathname}`;
    }
  } catch {
    // falls through
  }
  throw new Error('The order page address was not recognised. Nothing was charged.');
}

export function nextStep(data: CheckoutAnswer, here: string): NextStep {
  const orderUrl = orderPageUrl(data.order_url, here);
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
      // No country_code: Airwallex then takes the buyer's location, which is what lets
      // Automatic Currency Conversion offer them their own currency. Sent as 'NL', it
      // kept every buyer in EUR (found 2026-10-27 from a UK connection).
      successUrl: orderUrl,
      cancelUrl: here,
    },
  };
}

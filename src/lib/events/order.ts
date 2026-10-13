// The order page's data, read from buzbo-be on the server. The token in the address is
// the buyer's only credential, so it never goes anywhere but into this one request.

export interface OrderView {
  status: 'pending' | 'paid' | 'cancelled';
  buyer_name: string;
  event: {
    title: string;
    slug: string;
    starts_at: string;
    ends_at: string | null;
    timezone: string;
    venue_name: string | null;
    venue_address: string | null;
    city: string | null;
  };
  ticket: { code: string; status: 'valid' | 'void'; type_name: string | null } | null;
}

/** The same shape buzbo-be accepts. Anything else is not an order and is not sent. */
const TOKEN = /^[A-Za-z0-9_-]{32,64}$/;

/** How many times the pending page reloads itself: 20 × 3 s is a minute. */
const MAX_REFRESHES = 20;

/** Null for anything that is not an order we can show: unknown, refused, or no answer. */
export async function fetchOrder(
  api: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OrderView | null> {
  if (!TOKEN.test(token)) return null;
  try {
    const response = await fetchImpl(`${api}/api/payments/orders/${token}`);
    if (!response.ok) return null;
    const body = (await response.json()) as { data: OrderView | null };
    return body.data ?? null;
  } catch (error) {
    console.error('events: could not read order', error);
    return null;
  }
}

/** The attempt number to put in the next reload's address, or null to stop reloading. */
export function nextRefresh(attempt: number): number | null {
  const done = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 0;
  return done >= MAX_REFRESHES ? null : done + 1;
}

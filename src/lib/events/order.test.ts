import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchOrder, nextRefresh } from './order.ts';

const VIEW = {
  status: 'paid',
  buyer_name: 'Anna',
  event: { title: 'Buzbo x Hubbs', slug: 'x', starts_at: '2026-11-05T16:00:00.000Z', ends_at: null, timezone: 'Europe/Amsterdam', venue_name: 'Hubbs', venue_address: null, city: 'Arnhem' },
  ticket: { code: 'abc', status: 'valid', type_name: 'General admission' },
};
const TOK = 'Zm9vYmFyYmF6cXV4Zm9vYmFyYmF6cXV4Zm9v';
const answering = (status: number, body: unknown) => async () =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('fetchOrder', () => {
  it('returns the order', async () => {
    const calls: string[] = [];
    const order = await fetchOrder('https://api.buzbo.com', TOK, async (url) => {
      calls.push(String(url));
      return answering(200, { data: VIEW, error: null })();
    });
    assert.deepEqual(order, VIEW);
    assert.deepEqual(calls, [`https://api.buzbo.com/api/payments/orders/${TOK}`]);
  });

  it('is null for an unknown order, a failing server and a server that does not answer', async () => {
    assert.equal(await fetchOrder('https://api.buzbo.com', TOK, answering(404, { data: null, error: {} })), null);
    assert.equal(await fetchOrder('https://api.buzbo.com', TOK, answering(500, { data: null, error: {} })), null);
    assert.equal(await fetchOrder('https://api.buzbo.com', TOK, async () => { throw new Error('offline'); }), null);
  });

  it('never puts a token with a slash or a dot-dot into a path', async () => {
    let called = false;
    const order = await fetchOrder('https://api.buzbo.com', '../admin', async () => {
      called = true;
      return answering(200, { data: VIEW, error: null })();
    });
    assert.equal(order, null);
    assert.equal(called, false);
  });
});

describe('nextRefresh', () => {
  it('reloads every three seconds for a minute, then stops', () => {
    assert.equal(nextRefresh(0), 1);
    assert.equal(nextRefresh(19), 20);
    assert.equal(nextRefresh(20), null);
    assert.equal(nextRefresh(Number.NaN), 1);
    assert.equal(nextRefresh(-5), 1);
  });
});

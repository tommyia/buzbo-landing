import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchOrder, nextRefresh, questionnaireLink, type OrderView } from './order.ts';

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
    const result = await fetchOrder('https://api.buzbo.com', TOK, async (url) => {
      calls.push(String(url));
      return answering(200, { data: VIEW, error: null })();
    });
    assert.deepEqual(result, { kind: 'found', order: VIEW });
    assert.deepEqual(calls, [`https://api.buzbo.com/api/payments/orders/${TOK}`]);
  });

  it('is unknown only when the server says there is no such order', async () => {
    assert.deepEqual(await fetchOrder('https://api.buzbo.com', TOK, answering(404, { data: null, error: {} })), { kind: 'unknown' });
  });

  // Somebody who has just paid must not be shown "not found" because the server was
  // restarting or busy: that is "try again", not "no such order".
  it('is unavailable when the server fails, is busy, or does not answer', async () => {
    for (const status of [429, 500, 502, 503]) {
      assert.deepEqual(await fetchOrder('https://api.buzbo.com', TOK, answering(status, { data: null, error: {} })), { kind: 'unavailable' });
    }
    assert.deepEqual(await fetchOrder('https://api.buzbo.com', TOK, async () => { throw new Error('offline'); }), { kind: 'unavailable' });
    assert.deepEqual(await fetchOrder('https://api.buzbo.com', TOK, answering(200, { data: null, error: null })), { kind: 'unavailable' });
  });

  it('never puts a token with a slash or a dot-dot into a path', async () => {
    let called = false;
    const result = await fetchOrder('https://api.buzbo.com', '../admin', async () => {
      called = true;
      return answering(200, { data: VIEW, error: null })();
    });
    assert.deepEqual(result, { kind: 'unknown' });
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

describe('questionnaireLink', () => {
  const order = (over: Partial<OrderView>): OrderView => ({
    status: 'paid',
    buyer_name: 'Anna',
    event: { title: 'E', slug: 'e', starts_at: '', ends_at: null, timezone: 'UTC', venue_name: null, venue_address: null, city: null },
    ticket: { code: 'c', status: 'valid', type_name: null },
    questionnaire_url: 'https://form.buzbo.com/e',
    ...over,
  });

  it('gives the form for a valid ticket', () => {
    assert.equal(questionnaireLink(order({})), 'https://form.buzbo.com/e');
  });

  it('gives nothing without a valid paid ticket or a form still to fill in', () => {
    assert.equal(questionnaireLink(order({ status: 'pending' })), null);
    assert.equal(questionnaireLink(order({ ticket: { code: 'c', status: 'void', type_name: null } })), null);
    assert.equal(questionnaireLink(order({ questionnaire_url: null })), null);
  });

  it('refuses anything that is not an https address', () => {
    assert.equal(questionnaireLink(order({ questionnaire_url: 'javascript:alert(1)' })), null);
  });
});

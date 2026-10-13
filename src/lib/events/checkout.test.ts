import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkoutLabel, nextStep } from './checkout.ts';

describe('checkoutLabel', () => {
  it('says Buy for a price and Register for free', () => {
    assert.equal(checkoutLabel(1000), 'Buy ticket');
    assert.equal(checkoutLabel(0), 'Register');
  });
});

describe('nextStep', () => {
  const here = 'https://buzbo.com/e-abc/arnhem';

  it('sends a free order straight to its page', () => {
    assert.deepEqual(nextStep({ order_url: 'https://buzbo.com/e-abc/orders/tok' }, here), {
      kind: 'redirect',
      url: 'https://buzbo.com/e-abc/orders/tok',
    });
  });

  it('hands a paid order to Airwallex, returning to the order page', () => {
    const step = nextStep(
      {
        intent_id: 'int_1',
        client_secret: 'secret',
        currency: 'EUR',
        env: 'prod',
        order_url: 'https://buzbo.com/e-abc/orders/tok',
      },
      here,
    );
    assert.deepEqual(step, {
      kind: 'airwallex',
      options: {
        env: 'prod',
        mode: 'payment',
        intent_id: 'int_1',
        client_secret: 'secret',
        currency: 'EUR',
        country_code: 'NL',
        successUrl: 'https://buzbo.com/e-abc/orders/tok',
        cancelUrl: here,
      },
    });
  });

  it('refuses an order page that is not on this site', () => {
    assert.throws(() => nextStep({ order_url: 'https://evil.example/orders/tok' }, here), /order page/);
    assert.throws(() => nextStep({ order_url: 'javascript:alert(1)' }, here), /order page/);
    assert.throws(() => nextStep({}, here), /order page/);
  });
});

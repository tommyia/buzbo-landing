import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { checkoutLabel, checkoutRefusal, nextStep } from './checkout.ts';

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
        successUrl: 'https://buzbo.com/e-abc/orders/tok',
        cancelUrl: here,
      },
    });
  });

  // The buyer may be on www.buzbo.com or a preview address while buzbo-be builds the
  // link from LANDING_URL. Only the PATH is taken from the answer, so they stay on the
  // site they are on — and the answer can never send them to another one.
  it('goes to the order path on the site the buyer is on', () => {
    assert.deepEqual(nextStep({ order_url: 'https://buzbo.com/e-abc/orders/tok' }, 'https://www.buzbo.com/e-abc/arnhem'), {
      kind: 'redirect',
      url: 'https://www.buzbo.com/e-abc/orders/tok',
    });
    assert.deepEqual(nextStep({ order_url: 'https://evil.example/e-abc/orders/tok?x=1#y' }, here), {
      kind: 'redirect',
      url: 'https://buzbo.com/e-abc/orders/tok',
    });
  });

  it('refuses an answer with no usable order page', () => {
    assert.throws(() => nextStep({ order_url: 'javascript:alert(1)' }, here), /order page/);
    assert.throws(() => nextStep({ order_url: 'https://buzbo.com//evil.example/x' }, here), /order page/);
    assert.throws(() => nextStep({ order_url: 'https://buzbo.com/' }, here), /order page/);
    assert.throws(() => nextStep({}, here), /order page/);
  });
});

describe('checkoutRefusal', () => {
  const ok = { name: 'Anouk', email: 'anouk@example.com', confirmEmail: 'anouk@example.com', emailValid: true };

  it('lets a complete form through', () => {
    assert.equal(checkoutRefusal(ok), null);
  });

  it('asks for a name and a valid email first', () => {
    assert.equal(checkoutRefusal({ ...ok, name: '  ' }), 'Enter your name.');
    assert.equal(checkoutRefusal({ ...ok, email: ' ' }), 'Enter a valid email address.');
    assert.equal(checkoutRefusal({ ...ok, emailValid: false }), 'Enter a valid email address.');
  });

  it('refuses a confirmation that is empty or different', () => {
    assert.equal(checkoutRefusal({ ...ok, confirmEmail: '' }), 'Type your email address again to confirm it.');
    assert.equal(checkoutRefusal({ ...ok, confirmEmail: 'anouk@exmaple.com' }), 'The email addresses do not match.');
  });

  it('ignores case and spaces around the addresses', () => {
    assert.equal(checkoutRefusal({ ...ok, confirmEmail: ' Anouk@Example.com ' }), null);
  });
});

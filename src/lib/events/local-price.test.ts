import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { localPriceEstimate, visitorCountry } from './local-price.ts';

describe('visitorCountry', () => {
  const headers = new Headers({ 'cf-ipcountry': 'GB' });

  it('reads Cloudflare, and lets the query override it', () => {
    assert.equal(visitorCountry(headers, new URLSearchParams()), 'GB');
    assert.equal(visitorCountry(headers, new URLSearchParams('country=id')), 'ID');
  });

  it('is null for nothing usable', () => {
    assert.equal(visitorCountry(new Headers(), new URLSearchParams()), null);
    assert.equal(visitorCountry(headers, new URLSearchParams('country=nope')), null);
  });
});

describe('localPriceEstimate', () => {
  const rates = { GBP: 0.87, IDR: 18500, JPY: 165 };

  it('converts into the visitor country currency', () => {
    assert.equal(localPriceEstimate(1000, 'EUR', rates, 'GB'), '≈ £8.70');
    assert.equal(localPriceEstimate(1000, 'EUR', rates, 'JP'), '≈ ¥1,650');
    assert.equal(localPriceEstimate(1000, 'EUR', rates, 'ID'), '≈ IDR 185,000');
  });

  it('shows nothing when there is nothing to convert', () => {
    assert.equal(localPriceEstimate(0, 'EUR', rates, 'GB'), null);
    assert.equal(localPriceEstimate(1000, 'GBP', rates, 'GB'), null);
    assert.equal(localPriceEstimate(1000, 'EUR', rates, 'NL'), null);
    assert.equal(localPriceEstimate(1000, 'EUR', rates, 'US'), null);
    assert.equal(localPriceEstimate(1000, 'EUR', rates, null), null);
    assert.equal(localPriceEstimate(1000, 'EUR', null, 'GB'), null);
  });
});

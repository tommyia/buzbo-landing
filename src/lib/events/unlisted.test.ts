import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eventWaitlistUrl, unlistedEventPage, withoutUnlisted } from './unlisted.ts';

test('an unlisted event has its own page and leaves the list', () => {
  assert.equal(unlistedEventPage('buzbo-x-uncommon'), '/buzbo-x-uncommon');
  assert.deepEqual(withoutUnlisted([{ slug: 'buzbo-x-uncommon' }, { slug: 'juntos' }]), [{ slug: 'juntos' }]);
});

test('other slugs, including names on Object.prototype, are listed as usual', () => {
  assert.equal(unlistedEventPage('juntos'), null);
  assert.equal(unlistedEventPage('constructor'), null);
});

test('only Buzbo x Uncommon sends people to the London waiting list', () => {
  assert.equal(eventWaitlistUrl('buzbo-x-uncommon'), 'https://london.buzbo.com/#signup');
  assert.equal(eventWaitlistUrl('juntos-offices-x-buzbo-london-networking-with-intent'), null);
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allEventsHref } from './country.ts';

test('a London event sends "All events" to the London list', () => {
  assert.equal(allEventsHref('GB', '/events'), 'https://london.buzbo.com/events');
});

test('any other event keeps this site\'s list', () => {
  assert.equal(allEventsHref('NL', '/events'), '/events');
  assert.equal(allEventsHref(undefined, '/events'), '/events');
});

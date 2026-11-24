import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eventsListHref, isLondonEvent, listCountry } from './list-filter.ts';

test('the list shows NL unless the address asks for the UK', () => {
	assert.equal(listCountry(null), 'NL');
	assert.equal(listCountry(''), 'NL');
	assert.equal(listCountry('nl'), 'NL');
	assert.equal(listCountry('fr'), 'NL');
	assert.equal(listCountry('uk'), 'GB');
	assert.equal(listCountry('UK'), 'GB');
	assert.equal(listCountry('gb'), 'GB');
});

test('a list link keeps the other filter and leaves defaults out of the address', () => {
	assert.equal(eventsListHref('/events', 'NL', 'upcoming'), '/events');
	assert.equal(eventsListHref('/events', 'NL', 'past'), '/events?period=past');
	assert.equal(eventsListHref('/events', 'GB', 'upcoming'), '/events?country=uk');
	assert.equal(eventsListHref('/events', 'GB', 'past'), '/events?country=uk&period=past');
});

test('a GB event gets the London look, going by its country or, without one, its time zone', () => {
	assert.equal(isLondonEvent({ country: 'GB' }), true);
	assert.equal(isLondonEvent({ country: 'NL' }), false);
	assert.equal(isLondonEvent({ timezone: 'Europe/London' }), true);
	assert.equal(isLondonEvent({ timezone: 'Europe/Amsterdam' }), false);
	assert.equal(isLondonEvent({}), false);
});

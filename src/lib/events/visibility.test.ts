import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeEventsPath, routeEvents } from './visibility.ts';

const HIDDEN = '/e-6b36024259cdeef0';

describe('normalizeEventsPath', () => {
  it('accepts one lowercase segment', () => {
    assert.equal(normalizeEventsPath('/events'), '/events');
    assert.equal(normalizeEventsPath(` ${HIDDEN} `), HIDDEN);
  });

  it('treats anything else as unset', () => {
    for (const bad of [undefined, null, '', 'events', '/', '/a/b', '/Events', '/e x', '/events/']) {
      assert.equal(normalizeEventsPath(bad), null);
    }
  });
});

describe('routeEvents', () => {
  it('serves the pages at the hidden path and nowhere else', () => {
    assert.deepEqual(routeEvents(HIDDEN, HIDDEN), { kind: 'rewrite', to: '/events' });
    assert.deepEqual(routeEvents(`${HIDDEN}/arnhem`, HIDDEN), { kind: 'rewrite', to: '/events/arnhem' });
    assert.deepEqual(routeEvents('/events', HIDDEN), { kind: 'hidden' });
    assert.deepEqual(routeEvents('/events/arnhem', HIDDEN), { kind: 'hidden' });
  });

  it('does not match a path that only starts with the same letters', () => {
    assert.deepEqual(routeEvents(`${HIDDEN}x`, HIDDEN), { kind: 'pass' });
    assert.deepEqual(routeEvents('/events-archive', HIDDEN), { kind: 'pass' });
  });

  it('hides the pages everywhere when no path is set', () => {
    assert.deepEqual(routeEvents('/events', null), { kind: 'hidden' });
    assert.deepEqual(routeEvents('/events/arnhem', null), { kind: 'hidden' });
  });

  it('leaves /events alone once it is the public path', () => {
    assert.deepEqual(routeEvents('/events', '/events'), { kind: 'pass' });
    assert.deepEqual(routeEvents('/events/arnhem', '/events'), { kind: 'pass' });
  });

  it('leaves the rest of the site alone', () => {
    for (const path of ['/', '/blog', '/blog/a-post', '/app/tnc']) {
      assert.deepEqual(routeEvents(path, HIDDEN), { kind: 'pass' });
      assert.deepEqual(routeEvents(path, null), { kind: 'pass' });
    }
  });
});

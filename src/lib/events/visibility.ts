// Where the event pages answer. Pure, so it can be tested without the Workers runtime.
//
// The pages are files under src/pages/events. Until ticket sales have been tested they
// must not be reachable at /events, so EVENTS_PATH names the path they answer on instead:
// an unguessable one while hidden, '/events' once they are public. Unset, they answer
// nowhere.

export const PUBLIC_EVENTS_PATH = '/events';

export type EventsRoute =
  | { kind: 'pass' }
  /** Answer 404: an event page asked for by a path it is not served on. */
  | { kind: 'hidden' }
  /** Serve the page at `to`, under the address the visitor asked for. */
  | { kind: 'rewrite'; to: string };

/** One lowercase segment, e.g. '/e-6b36024259cdeef0'. Anything else counts as unset, so a
 *  typo hides the pages rather than serving them somewhere unintended. */
export function normalizeEventsPath(value: string | undefined | null): string | null {
  const path = (value ?? '').trim();
  return /^\/[a-z0-9][a-z0-9-]*$/.test(path) ? path : null;
}

function under(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function routeEvents(pathname: string, eventsPath: string | null): EventsRoute {
  if (eventsPath === PUBLIC_EVENTS_PATH) return { kind: 'pass' };
  if (under(pathname, PUBLIC_EVENTS_PATH)) return { kind: 'hidden' };
  if (eventsPath && under(pathname, eventsPath)) {
    return { kind: 'rewrite', to: PUBLIC_EVENTS_PATH + pathname.slice(eventsPath.length) };
  }
  return { kind: 'pass' };
}

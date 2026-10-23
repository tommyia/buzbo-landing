import { readEnv } from '../env';
import { normalizeEventsPath, PUBLIC_EVENTS_PATH } from './visibility';

/** The path the event pages answer on, from EVENTS_PATH in wrangler.json. Null hides them. */
export function eventsPath(): string | null {
  return normalizeEventsPath(readEnv('EVENTS_PATH'));
}

/** True once the pages are at /events and may be linked from the rest of the site. */
export function eventsArePublic(): boolean {
  return eventsPath() === PUBLIC_EVENTS_PATH;
}

/** A link to the list ('') or to something under it ('/arnhem', '?period=past'). */
export function eventsHref(rest = ''): string {
  return `${eventsPath() ?? PUBLIC_EVENTS_PATH}${rest}`;
}

/** buzbo-be, which starts a ticket payment. Unset, no Buy button is shown. */
export function checkoutApiUrl(): string | null {
  const url = (readEnv('PUBLIC_BUZBO_BE_URL') ?? '').trim().replace(/\/+$/, '');
  return /^https:\/\//.test(url) ? url : null;
}

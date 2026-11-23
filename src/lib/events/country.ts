// GB events are listed on london.buzbo.com; their detail page and checkout still live here.

const LONDON_EVENTS_URL = 'https://london.buzbo.com/events';

/** Where "All events" on a detail page goes: the list that actually shows this event. */
export function allEventsHref(country: string | null | undefined, siteList: string): string {
  return country === 'GB' ? LONDON_EVENTS_URL : siteList;
}

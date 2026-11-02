// Published events that are sold on a page of their own: left out of /events and the
// sitemap, and /events/<slug> sends visitors to that page.
const UNLISTED_EVENT_PAGES: Record<string, string> = {
  'buzbo-x-uncommon': '/buzbo-x-uncommon',
};

export const UNLISTED_EVENT_SLUGS = Object.keys(UNLISTED_EVENT_PAGES);

/** The event's own page, or null for an event listed as usual. */
export function unlistedEventPage(slug: string): string | null {
  return Object.hasOwn(UNLISTED_EVENT_PAGES, slug) ? UNLISTED_EVENT_PAGES[slug] : null;
}

/** Leaves unlisted events out of a list of events. */
export function withoutUnlisted<T extends { slug: string }>(events: T[]): T[] {
  return events.filter((event) => unlistedEventPage(event.slug) === null);
}

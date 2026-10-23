import type { APIRoute } from 'astro';
import { eventIcs } from '../../../lib/events/ics';
import { eventsHref } from '../../../lib/events/paths';
import { getPublishedEvent } from '../../../lib/events/queries';

export const prerender = false;

// "Add to calendar" for Apple Calendar and anything else that opens .ics. Linked from the
// ticket email. Only a published event, the same as its page.
export const GET: APIRoute = async ({ params, url }) => {
	const event = params.slug ? await getPublishedEvent(params.slug) : null;
	if (!event) return new Response('Not found', { status: 404 });

	const page = new URL(eventsHref(`/${event.slug}`), url.origin).href;
	return new Response(eventIcs(event, page), {
		headers: {
			'Content-Type': 'text/calendar; charset=utf-8',
			'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
			'Cache-Control': 'public, max-age=900',
		},
	});
};

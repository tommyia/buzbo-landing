import { defineMiddleware } from 'astro:middleware';
import { eventsPath } from './lib/events/paths';
import { routeEvents } from './lib/events/visibility';

export const onRequest = defineMiddleware(async (context, next) => {
	// The event pages answer on EVENTS_PATH only — see lib/events/visibility.ts.
	const route = routeEvents(context.url.pathname, eventsPath());

	let response: Response;
	if (route.kind === 'hidden') {
		response = new Response(null, { status: 404, statusText: 'Not Found' });
	} else if (route.kind === 'rewrite') {
		response = await next(new URL(route.to + context.url.search, context.url));
		// A hidden address that ends up in a search index is not hidden.
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
	} else {
		response = await next();
	}

	response.headers.set('X-Content-Type-Options', 'nosniff');
	return response;
});

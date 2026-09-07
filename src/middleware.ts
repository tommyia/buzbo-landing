import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
	const response = await next();
	response.headers.set('X-Content-Type-Options', 'nosniff');
	return response;
});

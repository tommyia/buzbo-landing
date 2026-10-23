import type { APIRoute } from 'astro';
import { robotsTxt } from '../lib/seo-files/sitemap';

export const prerender = false;

export const GET: APIRoute = ({ url }) =>
	new Response(robotsTxt(url.origin), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
	});

import type { APIRoute } from 'astro';
import { eventsArePublic } from '../lib/events/paths';
import { listPublishedEvents } from '../lib/events/queries';
import { buildSitemap, type SitemapArticle } from '../lib/seo-files/sitemap';
import { getPublicSupabase, isSupabaseConfigured } from '../lib/supabase';

export const prerender = false;

// Read on every request (with a short cache), so a post appears here once it is published.
export const GET: APIRoute = async ({ url }) => {
	let articles: SitemapArticle[] = [];
	if (isSupabaseConfigured()) {
		const { data, error } = await getPublicSupabase()
			.from('buzbo_landing_article')
			.select('slug, updated_at, published_at')
			.eq('status', 'published')
			.order('published_at', { ascending: false });
		if (error) console.error('sitemap: could not list articles', error);
		articles = (data ?? []) as SitemapArticle[];
	}
	const events = eventsArePublic() ? await listPublishedEvents() : null;

	return new Response(buildSitemap(url.origin, { articles, events }), {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=900',
		},
	});
};

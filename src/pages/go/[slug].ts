import type { APIRoute } from 'astro';
import { GO_FALLBACK, readClick, readSlug, safeDestination } from '../../lib/go';
import { getPublicSupabase, isSupabaseConfigured } from '../../lib/supabase';

export const prerender = false;

/** Logs one click and redirects. See lib/go.ts. */
const handle: APIRoute = async ({ params, request }) => {
	const slug = readSlug(params.slug);
	let destination = GO_FALLBACK;

	if (slug && isSupabaseConfigured()) {
		const click = readClick(request);
		const { data, error } = await getPublicSupabase().rpc('buzbo_go_resolve', {
			p_slug: slug,
			p_device: click.device,
			p_country: click.country,
			p_utm_source: click.utmSource,
			p_utm_medium: click.utmMedium,
			p_utm_campaign: click.utmCampaign,
			p_referrer_host: click.referrerHost,
			p_log: click.log,
		});
		if (error) console.error('go: resolve failed', slug, error.message);
		else destination = safeDestination(data);
	}

	return new Response(null, {
		status: 302,
		headers: {
			Location: destination,
			// Every visit must reach the Worker, or the click is not counted.
			'Cache-Control': 'no-store',
			'X-Robots-Tag': 'noindex, nofollow',
			'Referrer-Policy': 'no-referrer-when-downgrade',
		},
	});
};

export const GET = handle;
export const HEAD = handle;

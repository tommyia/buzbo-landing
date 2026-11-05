import type { APIRoute } from 'astro';
import { getAppDestination } from '../lib/blog-cta';
import { readClick } from '../lib/go';
import { getPublicSupabase, isSupabaseConfigured } from '../lib/supabase';

export const prerender = false;

/** The go link a blog QR scan is logged under: buzbo-event migration 20261105000001. */
const GO_SLUG = 'get-app';

/**
 * Where a blog article's QR code points. The phone that scans it goes to its store,
 * tagged with the article, and the scan is logged like a go link click (utm_campaign =
 * the article's slug) so Blog performance can count it. A computer goes home.
 */
const handle: APIRoute = async ({ request }) => {
	const click = readClick(request);
	const campaign = (click.utmCampaign ?? '').slice(0, 100);

	if (isSupabaseConfigured()) {
		// Logged, never in the way: the redirect does not wait on a failure.
		const { error } = await getPublicSupabase().rpc('buzbo_go_resolve', {
			p_slug: GO_SLUG,
			p_device: click.device,
			p_country: click.country,
			p_utm_source: 'blog',
			p_utm_medium: 'qr',
			p_utm_campaign: campaign || null,
			p_referrer_host: click.referrerHost,
			p_log: click.log,
		});
		if (error) console.error('get-app: log failed', error.message);
	}

	return new Response(null, {
		status: 302,
		headers: {
			Location: getAppDestination(click.device, campaign || 'unknown'),
			'Cache-Control': 'no-store',
			'X-Robots-Tag': 'noindex, nofollow',
		},
	});
};

export const GET = handle;
export const HEAD = handle;

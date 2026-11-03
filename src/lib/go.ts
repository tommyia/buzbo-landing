/**
 * buzbo.com/go/<slug>: tracked short links for the Linktree buttons. The page logs a
 * click through buzbo_go_resolve() (buzbo-event migration 20261103000001_go_links.sql)
 * and redirects to the link's destination. Links are managed in buzbo-event.
 *
 * Pure helpers only, so they can be tested without the Workers runtime.
 */

export type GoDevice = 'ios' | 'android' | 'desktop' | 'other';

export type GoClick = {
	device: GoDevice;
	country: string | null;
	utmSource: string | null;
	utmMedium: string | null;
	utmCampaign: string | null;
	referrerHost: string | null;
	/** False for bots and link previews: they are sent on but not counted. */
	log: boolean;
};

/** Where a link that is unknown, switched off or unreachable sends people. */
export const GO_FALLBACK = '/';

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function readSlug(value: string | undefined): string | null {
	const slug = value?.toLowerCase() ?? '';
	return SLUG.test(slug) ? slug : null;
}

/** Crawlers and the previews chat apps and social sites fetch when a link is pasted.
 *  Not "linkedin" or "telegram": their in-app browsers carry those names; their
 *  preview fetchers end in "bot". */
const BOT =
	/bot|crawl|spider|slurp|preview|facebookexternalhit|meta-externalagent|whatsapp|slack|embedly|curl|wget|python|headless|lighthouse/i;

export function isBot(userAgent: string): boolean {
	return userAgent === '' || BOT.test(userAgent);
}

export function deviceOf(userAgent: string): GoDevice {
	if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
	if (/android/i.test(userAgent)) return 'android';
	if (/windows|macintosh|x11|cros|linux/i.test(userAgent)) return 'desktop';
	return 'other';
}

function hostOf(referrer: string | null): string | null {
	if (!referrer) return null;
	try {
		return new URL(referrer).hostname.replace(/^www\./, '') || null;
	} catch {
		return null;
	}
}

const param = (url: URL, key: string): string | null => url.searchParams.get(key)?.trim() || null;

/** Everything about one request that ends up in the click row. */
export function readClick(request: Request): GoClick {
	const url = new URL(request.url);
	const userAgent = request.headers.get('user-agent') ?? '';
	const country = request.headers.get('cf-ipcountry');
	return {
		device: deviceOf(userAgent),
		// Cloudflare sends XX for unknown and T1 for Tor.
		country: country && /^[A-Z]{2}$/.test(country) && country !== 'XX' && country !== 'T1' ? country : null,
		utmSource: param(url, 'utm_source'),
		utmMedium: param(url, 'utm_medium'),
		utmCampaign: param(url, 'utm_campaign'),
		referrerHost: hostOf(request.headers.get('referer')),
		log: request.method === 'GET' && !isBot(userAgent),
	};
}

/** Only https destinations are followed; anything else falls back. */
export function safeDestination(value: unknown): string {
	if (typeof value !== 'string') return GO_FALLBACK;
	try {
		return new URL(value).protocol === 'https:' ? value : GO_FALLBACK;
	} catch {
		return GO_FALLBACK;
	}
}

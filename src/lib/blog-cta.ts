/**
 * The blog's call to action: download the app. Three placements share one card:
 * `end` (after every article), `inline` (a block the writer puts in the article in
 * buzbo-event's editor) and `sticky` (a bar on phones once half the article is read).
 *
 * What it measures, for Blog performance in buzbo-event:
 *  - GA4 events `blog_cta_view_<placement>` and `blog_cta_click_<placement>_<ios|android>`.
 *    The placement and store are in the event name because the property has no custom
 *    dimensions to break a parameter down by.
 *  - Store campaign tags on every badge link, so installs show per article in App Store
 *    Connect (campaign `blog-<slug>`) and Play Console (utm_campaign `<slug>`).
 *  - On a computer a QR code to /get-app, which logs the scan as a go link click.
 *
 * Pure: returns markup strings, so it can be tested without Astro.
 */

import { qrSvg } from './events/qr.ts';
import type { GoDevice } from './go.ts';

export type CtaPlacement = 'end' | 'inline' | 'sticky';
export type CtaStore = 'app_store' | 'google_play';

export const CTA_DEFAULT = {
	heading: 'Meet the people behind stories like this',
	text: 'Buzbo connects you with professionals near you for a coffee, a walk or a real conversation. Free on iPhone and Android.',
};

const SITE = 'https://www.buzbo.com';
const APP_STORE_ID = '6791552258';
const PLAY_PACKAGE = 'com.buzbo.app';
/**
 * App Store Connect's provider token (App Analytics > Campaigns > Generate link). Without
 * it Apple ignores the campaign token, so installs per article stay blank there; the
 * links still work.
 */
export const APP_STORE_PROVIDER_TOKEN = '';
/** Apple's limit on a campaign token. */
const CAMPAIGN_TOKEN_MAX = 40;

/** The GA4 event a placement and store send, without parameters. */
export const ctaEventStore = (store: CtaStore) => (store === 'app_store' ? 'ios' : 'android');

/** Badge links tagged with where the tap came from. */
export function ctaStoreLinks(slug: string, medium: CtaPlacement | 'qr'): Record<CtaStore, string> {
	const apple = new URL(`https://apps.apple.com/app/apple-store/id${APP_STORE_ID}`);
	if (APP_STORE_PROVIDER_TOKEN) apple.searchParams.set('pt', APP_STORE_PROVIDER_TOKEN);
	apple.searchParams.set('ct', `blog-${slug}`.slice(0, CAMPAIGN_TOKEN_MAX));
	apple.searchParams.set('mt', '8');

	const play = new URL('https://play.google.com/store/apps/details');
	play.searchParams.set('id', PLAY_PACKAGE);
	play.searchParams.set(
		'referrer',
		new URLSearchParams({ utm_source: 'buzbo_blog', utm_medium: medium, utm_campaign: slug }).toString(),
	);
	return { app_store: apple.href, google_play: play.href };
}

/** A phone sees only the store it can install from; anything else sees both. */
export function ctaStores(device: GoDevice): CtaStore[] {
	if (device === 'ios') return ['app_store'];
	if (device === 'android') return ['google_play'];
	return ['app_store', 'google_play'];
}

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function decodeAttribute(value: string): string {
	return value
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}

const APPLE_ICON =
	'<svg viewBox="0 0 384 512" fill="currentColor" aria-hidden="true" class="size-6"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>';
const PLAY_ICON =
	'<svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true" class="size-5"><path d="M325.3 234.3 104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/></svg>';

const BADGE =
	'blog-cta-badge inline-flex h-12 items-center gap-2.5 rounded-xl bg-burgundy px-4 text-cream no-underline transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy';

function badgeHtml(store: CtaStore, href: string): string {
	const [icon, small, big, label] =
		store === 'app_store'
			? [APPLE_ICON, 'Download on the', 'App Store', 'Download on the App Store']
			: [PLAY_ICON, 'GET IT ON', 'Google Play', 'Get it on Google Play'];
	return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener" data-cta-store="${store}" class="${BADGE}" aria-label="${label}">${icon}<span class="flex flex-col text-left leading-none"><span class="text-[10px] font-medium">${small}</span><span class="mt-0.5 text-lg font-semibold tracking-tight">${big}</span></span></a>`;
}

/** The QR a computer shows: it opens /get-app on the phone that scans it. */
function qrHtml(slug: string): string {
	const target = `${SITE}/get-app?utm_campaign=${encodeURIComponent(slug)}`;
	const svg = qrSvg(target).replace('<svg ', '<svg data-cta-qr="" role="img" aria-label="QR code to get the Buzbo app" ');
	return `<div class="hidden shrink-0 flex-col items-center gap-1 sm:flex"><div class="size-28 rounded-lg bg-white p-1">${svg}</div><span class="text-[11px] text-muted">Scan with your phone</span></div>`;
}

export function ctaCardHtml(input: {
	heading: string;
	text: string;
	slug: string;
	placement: Exclude<CtaPlacement, 'sticky'>;
	device: GoDevice;
}): string {
	const links = ctaStoreLinks(input.slug, input.placement);
	const badges = ctaStores(input.device)
		.map((store) => badgeHtml(store, links[store]))
		.join('');
	const qr = input.device === 'ios' || input.device === 'android' ? '' : qrHtml(input.slug);
	return `<aside class="blog-cta not-prose my-10 flex items-center gap-6 rounded-2xl bg-tint p-6 ring-1 ring-burgundy/15" data-cta-placement="${input.placement}"><div class="min-w-0 flex-1"><p class="font-serif text-2xl leading-tight text-primary-crimson">${escapeHtml(input.heading)}</p><p class="mt-2 text-gray-700">${escapeHtml(input.text)}</p><div class="mt-4 flex flex-wrap gap-3">${badges}</div></div>${qr}</aside>`;
}

/** The bar on a phone: one line and the one badge it can use. */
export function ctaStickyHtml(input: { slug: string; device: GoDevice }): string {
	const links = ctaStoreLinks(input.slug, 'sticky');
	const store = ctaStores(input.device)[0]!;
	return `<div class="blog-cta-sticky fixed inset-x-3 bottom-3 z-40 flex translate-y-[150%] items-center gap-3 rounded-2xl bg-cream p-3 shadow-lg ring-1 ring-burgundy/20 transition-transform duration-300 md:hidden" data-cta-placement="sticky" hidden><p class="min-w-0 flex-1 text-sm leading-snug text-ink">Meet professionals near you. <span class="font-semibold">Free app.</span></p>${badgeHtml(store, links[store])}<button type="button" data-cta-dismiss class="shrink-0 rounded-full p-1.5 text-muted hover:bg-tint" aria-label="Close"><svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>`;
}

const MARKER = /<div\b(?=[^>]*\bdata-buzbo-cta\b)([^>]*)>\s*<\/div>/gi;

function attribute(attrs: string, name: string): string {
	const found = new RegExp(`\\b${name}="([^"]*)"`, 'i').exec(attrs);
	return found ? decodeAttribute(found[1]!).trim() : '';
}

/**
 * The editor's in-article block, `<div data-buzbo-cta data-heading data-text></div>`,
 * becomes a card. Empty copy falls back to the default.
 */
export function renderInlineCtas(html: string, ctx: { slug: string; device: GoDevice }): string {
	return html.replace(MARKER, (_, attrs: string) =>
		ctaCardHtml({
			heading: attribute(attrs, 'data-heading') || CTA_DEFAULT.heading,
			text: attribute(attrs, 'data-text') || CTA_DEFAULT.text,
			slug: ctx.slug,
			placement: 'inline',
			device: ctx.device,
		}),
	);
}

/** Where /get-app sends the phone that scanned a blog QR code. */
export function getAppDestination(device: GoDevice, campaign: string): string {
	const links = ctaStoreLinks(campaign, 'qr');
	if (device === 'ios') return links.app_store;
	if (device === 'android') return links.google_play;
	return '/#download';
}

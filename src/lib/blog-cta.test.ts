import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	CTA_DEFAULT,
	ctaCardHtml,
	ctaStoreLinks,
	ctaStores,
	getAppDestination,
	renderInlineCtas,
} from './blog-cta.ts';

describe('ctaStoreLinks', () => {
	const links = ctaStoreLinks('coffee-guide', 'end');

	it('tags the App Store link with a campaign token for the article', () => {
		const url = new URL(links.app_store);
		assert.equal(url.hostname, 'apps.apple.com');
		assert.equal(url.searchParams.get('ct'), 'blog-coffee-guide');
		assert.equal(url.searchParams.get('mt'), '8');
	});

	it('keeps the App Store campaign token within the 40 characters Apple allows', () => {
		const long = ctaStoreLinks('a'.repeat(90), 'end');
		assert.equal(new URL(long.app_store).searchParams.get('ct')!.length, 40);
	});

	it('passes UTM tags to Google Play through its referrer', () => {
		const url = new URL(links.google_play);
		assert.equal(url.searchParams.get('id'), 'com.buzbo.app');
		const referrer = new URLSearchParams(url.searchParams.get('referrer')!);
		assert.equal(referrer.get('utm_source'), 'buzbo_blog');
		assert.equal(referrer.get('utm_medium'), 'end');
		assert.equal(referrer.get('utm_campaign'), 'coffee-guide');
	});
});

describe('ctaStores', () => {
	it('shows a phone only the store it can install from', () => {
		assert.deepEqual(ctaStores('ios'), ['app_store']);
		assert.deepEqual(ctaStores('android'), ['google_play']);
	});

	it('shows a computer both', () => {
		assert.deepEqual(ctaStores('desktop'), ['app_store', 'google_play']);
		assert.deepEqual(ctaStores('other'), ['app_store', 'google_play']);
	});
});

describe('ctaCardHtml', () => {
	const base = { heading: 'Meet people', text: 'Free app.', slug: 'coffee', placement: 'end' as const };

	it('marks the card and each badge for the tracking script', () => {
		const html = ctaCardHtml({ ...base, device: 'ios' });
		assert.match(html, /data-cta-placement="end"/);
		assert.match(html, /data-cta-store="app_store"/);
		assert.doesNotMatch(html, /data-cta-store="google_play"/);
	});

	it('adds a QR code for the phone on a computer, and not on a phone', () => {
		assert.match(ctaCardHtml({ ...base, device: 'desktop' }), /<svg[^>]*data-cta-qr/);
		assert.doesNotMatch(ctaCardHtml({ ...base, device: 'android' }), /data-cta-qr/);
	});

	it('escapes the copy, which comes from the editor', () => {
		const html = ctaCardHtml({ ...base, heading: '<script>x</script>', text: 'a & "b"', device: 'ios' });
		assert.doesNotMatch(html, /<script>x/);
		assert.match(html, /&lt;script&gt;x&lt;\/script&gt;/);
		assert.match(html, /a &amp; &quot;b&quot;/);
	});
});

describe('renderInlineCtas', () => {
	const ctx = { slug: 'coffee', device: 'ios' as const };

	it('turns the editor’s marker into a card with its own copy', () => {
		const html = renderInlineCtas('<p>One</p><div data-buzbo-cta="" data-heading="Try it" data-text="On your phone"></div><p>Two</p>', ctx);
		assert.match(html, /^<p>One<\/p>/);
		assert.match(html, /<p>Two<\/p>$/);
		assert.match(html, /data-cta-placement="inline"/);
		assert.match(html, /Try it/);
		assert.match(html, /On your phone/);
	});

	it('falls back to the default copy when the block left it empty', () => {
		const html = renderInlineCtas('<div data-buzbo-cta="" data-heading="" data-text=""></div>', ctx);
		assert.match(html, new RegExp(CTA_DEFAULT.heading));
	});

	it('reads attributes in any order and decodes them once', () => {
		const html = renderInlineCtas('<div data-text="Tom &amp; Jerry" data-buzbo-cta></div>', ctx);
		assert.match(html, /Tom &amp; Jerry/);
		assert.doesNotMatch(html, /&amp;amp;/);
	});

	it('leaves an article without a marker as it is', () => {
		assert.equal(renderInlineCtas('<p>Plain</p>', ctx), '<p>Plain</p>');
	});
});

describe('getAppDestination', () => {
	it('sends an iPhone to the App Store and an Android phone to Google Play, tagged as a QR scan', () => {
		const ios = new URL(getAppDestination('ios', 'coffee'));
		assert.equal(ios.hostname, 'apps.apple.com');
		assert.equal(ios.searchParams.get('ct'), 'blog-coffee');
		const android = new URL(getAppDestination('android', 'coffee'));
		const referrer = new URLSearchParams(android.searchParams.get('referrer')!);
		assert.equal(referrer.get('utm_medium'), 'qr');
	});

	it('sends a computer home, where both badges are', () => {
		assert.equal(getAppDestination('desktop', 'coffee'), '/#download');
	});
});

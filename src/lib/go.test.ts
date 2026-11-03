import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { GO_FALLBACK, deviceOf, isBot, readClick, readSlug, safeDestination } from './go.ts';

const IPHONE_INSTAGRAM =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0';
const ANDROID_TIKTOK =
	'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36 musical_ly_2023';

describe('readSlug', () => {
	it('keeps lowercase slugs and refuses anything else', () => {
		assert.equal(readSlug('Zoku-12nov'), 'zoku-12nov');
		assert.equal(readSlug('-bad'), null);
		assert.equal(readSlug('a/b'), null);
		assert.equal(readSlug(undefined), null);
		assert.equal(readSlug('a'.repeat(65)), null);
	});
});

describe('deviceOf', () => {
	it('reads the platform from the user agent', () => {
		assert.equal(deviceOf(IPHONE_INSTAGRAM), 'ios');
		assert.equal(deviceOf(ANDROID_TIKTOK), 'android');
		assert.equal(deviceOf('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)'), 'desktop');
		assert.equal(deviceOf('something'), 'other');
	});
});

describe('isBot', () => {
	it('flags previews and crawlers, not in-app browsers', () => {
		assert.equal(isBot('facebookexternalhit/1.1'), true);
		assert.equal(isBot('WhatsApp/2.23'), true);
		assert.equal(isBot('Googlebot/2.1'), true);
		assert.equal(isBot(''), true);
		assert.equal(isBot(IPHONE_INSTAGRAM), false);
		assert.equal(isBot(ANDROID_TIKTOK), false);
	});
});

describe('readClick', () => {
	it('reads utm tags, referrer host and country', () => {
		const click = readClick(
			new Request('https://www.buzbo.com/go/zoku?utm_source=ig&utm_medium=social', {
				headers: { 'user-agent': IPHONE_INSTAGRAM, referer: 'https://linktr.ee/buzbo', 'cf-ipcountry': 'NL' },
			}),
		);
		assert.deepEqual(click, {
			device: 'ios',
			country: 'NL',
			utmSource: 'ig',
			utmMedium: 'social',
			utmCampaign: null,
			referrerHost: 'linktr.ee',
			log: true,
		});
	});

	it('does not log HEAD requests or bots, and drops unknown countries', () => {
		const head = readClick(new Request('https://www.buzbo.com/go/zoku', { method: 'HEAD', headers: { 'user-agent': IPHONE_INSTAGRAM } }));
		assert.equal(head.log, false);
		const bot = readClick(new Request('https://www.buzbo.com/go/zoku', { headers: { 'user-agent': 'Slackbot', 'cf-ipcountry': 'XX' } }));
		assert.equal(bot.log, false);
		assert.equal(bot.country, null);
	});
});

describe('safeDestination', () => {
	it('follows https only', () => {
		assert.equal(safeDestination('https://luma.com/cidbsxcu'), 'https://luma.com/cidbsxcu');
		assert.equal(safeDestination('http://luma.com/x'), GO_FALLBACK);
		assert.equal(safeDestination('javascript:alert(1)'), GO_FALLBACK);
		assert.equal(safeDestination(null), GO_FALLBACK);
	});
});

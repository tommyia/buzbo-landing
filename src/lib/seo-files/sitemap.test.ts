import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSitemap, robotsTxt } from './sitemap.ts';

const ORIGIN = 'https://buzbo.com';

describe('buildSitemap', () => {
  it('lists the fixed pages, every blog post and every event under the origin', () => {
    const xml = buildSitemap(ORIGIN, {
      articles: [{ slug: 'first-post', updated_at: '2026-10-20T10:00:00Z', published_at: '2026-10-19T10:00:00Z' }],
      events: [{ slug: 'arnhem' }],
    });
    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
    for (const path of ['/', '/blog', '/events', '/app/faq', '/app/pp', '/app/tnc', '/app/child-safety']) {
      assert.ok(xml.includes(`<loc>${ORIGIN}${path}</loc>`), path);
    }
    assert.ok(xml.includes(`<loc>${ORIGIN}/blog/first-post</loc><lastmod>2026-10-20</lastmod>`));
    assert.ok(xml.includes(`<loc>${ORIGIN}/events/arnhem</loc>`));
  });

  it('falls back to published_at, and leaves lastmod out when neither date is set', () => {
    const xml = buildSitemap(ORIGIN, {
      articles: [
        { slug: 'a', updated_at: null, published_at: '2026-09-01T00:00:00Z' },
        { slug: 'b', updated_at: null, published_at: null },
      ],
      events: [],
    });
    assert.ok(xml.includes('<loc>https://buzbo.com/blog/a</loc><lastmod>2026-09-01</lastmod>'));
    assert.ok(xml.includes('<loc>https://buzbo.com/blog/b</loc></url>'));
  });

  it('escapes and encodes slugs so one odd slug cannot break the file', () => {
    const xml = buildSitemap(ORIGIN, { articles: [{ slug: 'r&d <tips>', updated_at: null, published_at: null }], events: [] });
    assert.ok(xml.includes('<loc>https://buzbo.com/blog/r%26d%20%3Ctips%3E</loc>'));
    assert.ok(!xml.includes('<tips>'));
  });

  it('leaves the events pages out when they are not public', () => {
    const xml = buildSitemap(ORIGIN, { articles: [], events: null });
    assert.ok(!xml.includes('/events'));
  });
});

describe('robotsTxt', () => {
  const txt = robotsTxt(ORIGIN);

  it('points to the sitemap', () => {
    assert.match(txt, /^Sitemap: https:\/\/buzbo\.com\/sitemap\.xml$/m);
  });

  it('names the search and AI crawlers and allows the site', () => {
    for (const bot of ['*', 'OAI-SearchBot', 'GPTBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Googlebot', 'Bingbot']) {
      assert.match(txt, new RegExp(`^User-agent: ${bot.replace('*', '\\*')}$`, 'm'), bot);
    }
    assert.match(txt, /^Allow: \/$/m);
  });

  it('keeps the API and private ticket orders out', () => {
    assert.match(txt, /^Disallow: \/api\/$/m);
    assert.match(txt, /^Disallow: \/events\/orders\/$/m);
  });
});

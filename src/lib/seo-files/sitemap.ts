// The text of /sitemap.xml and /robots.txt. Pure, so it can be tested without the Workers
// runtime; the routes in src/pages read the rows and the origin and hand them in here.

/** Pages that always exist. Blog posts and events are added from the database. */
const FIXED_PATHS = ['/', '/blog', '/app/faq', '/app/pp', '/app/tnc', '/app/child-safety'];

export interface SitemapArticle {
  slug: string;
  updated_at: string | null;
  published_at: string | null;
}

export interface SitemapEvent {
  slug: string;
}

export interface SitemapRows {
  articles: SitemapArticle[];
  /** Null while the event pages are not at /events: they must not be listed then. */
  events: SitemapEvent[] | null;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function url(loc: string, lastmod?: string | null): string {
  const day = lastmod ? lastmod.slice(0, 10) : '';
  return `<url><loc>${escapeXml(loc)}</loc>${day ? `<lastmod>${day}</lastmod>` : ''}</url>`;
}

export function buildSitemap(origin: string, rows: SitemapRows): string {
  const paths = rows.events ? [...FIXED_PATHS, '/events'] : FIXED_PATHS;
  const urls = [
    ...paths.map((path) => url(`${origin}${path}`)),
    ...rows.articles.map((a) => url(`${origin}/blog/${encodeURIComponent(a.slug)}`, a.updated_at ?? a.published_at)),
    ...(rows.events ?? []).map((e) => url(`${origin}/events/${encodeURIComponent(e.slug)}`)),
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/** Search engines and AI crawlers named on purpose, so it is plain that they are welcome.
 *  They share one group, so each of them reads the same Disallow lines. */
const CRAWLERS = [
  '*',
  'Googlebot',
  'Bingbot',
  'Applebot',
  'DuckDuckBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
];

export function robotsTxt(origin: string): string {
  return [
    ...CRAWLERS.map((bot) => `User-agent: ${bot}`),
    'Allow: /',
    'Disallow: /api/',
    // An order page is a ticket behind a private link.
    'Disallow: /events/orders/',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

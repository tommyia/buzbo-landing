// FAQPage structured data (schema.org), so search engines and AI tools can read a page's
// questions and answers as pairs. Pure, so it can be tested without the Workers runtime.
//
// Google only accepts FAQPage markup for questions and answers shown on the page, and not
// for ordinary headings that happen to be questions. So a blog post gets it only from a real
// FAQ section: a heading such as "FAQ" or "Frequently asked questions", followed by the
// questions. A question is either a deeper heading ending in "?", or a paragraph that opens
// with bold text ending in "?" (the answer may follow in the same paragraph).
// The section ends at the next heading at the FAQ heading's level or higher.

export type FaqItem = { question: string; answer: string };

const FAQ_HEADING = /^(faqs?|frequently asked questions|common questions)\b/i;
// Articles are flat HTML from the editor in buzbo-event: one block after another.
const BLOCK = /<(h[1-6]|p|ul|ol|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
const LEAD_BOLD = /^\s*<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>([\s\S]*)$/i;

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
  hellip: '…',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const point = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** Plain text of an HTML fragment. List items and line breaks become new lines. */
export function htmlToText(html: string): string {
  const text = decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  );
  return text
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

type Pending = { question: string; answer: string[] };

/** The question and answer pairs in an article's FAQ section, or [] when it has none. */
export function extractFaq(html: string): FaqItem[] {
  const items: FaqItem[] = [];
  let faqLevel: number | null = null;
  let current = null as Pending | null;

  const flush = () => {
    if (current) {
      const answer = current.answer.filter(Boolean).join('\n\n');
      if (answer) items.push({ question: current.question, answer });
    }
    current = null;
  };

  for (const [, tag, inner] of html.matchAll(BLOCK)) {
    const name = tag.toLowerCase();

    if (name[0] === 'h') {
      const level = Number(name[1]);
      const text = htmlToText(inner);
      if (faqLevel === null || level <= faqLevel) {
        flush();
        faqLevel = FAQ_HEADING.test(text) ? level : null;
      } else {
        flush();
        if (text.endsWith('?')) current = { question: text, answer: [] };
      }
      continue;
    }

    if (faqLevel === null) continue;

    if (name === 'p') {
      const lead = inner.match(LEAD_BOLD);
      const question = lead ? htmlToText(lead[2]) : '';
      if (lead && question.endsWith('?')) {
        flush();
        current = { question, answer: [htmlToText(lead[3])] };
        continue;
      }
    }

    current?.answer.push(htmlToText(inner));
  }
  flush();
  return items;
}

/** schema.org FAQPage for the given pairs, or null when there are none. */
export function faqPageJsonLd(items: FaqItem[]): Record<string, unknown> | null {
  if (items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

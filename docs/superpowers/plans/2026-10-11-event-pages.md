# Event Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The landing site shows published events at `/events` and `/events/<slug>`, laid out like Luma, with a Register button that goes to the event's external registration page.

**Architecture:** buzbo-event gains one column, `external_url`, and an editor field for it. buzbo-landing-v2 reads `buzbo_events` and `buzbo_event_ticket_types` with the publishable key under RLS, as it reads articles. Every date and price becomes text in one pure module, `src/lib/events/format.ts`, tested with `node --test`; the two Astro pages only arrange what it returns.

**Tech Stack:** Astro 7 SSR on Cloudflare Workers, Tailwind v4, supabase-js (publishable key), `Intl`, `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-11-event-pages-design.md`

## Global Constraints

- Two repos. Paths starting `../buzbo-event/` are in buzbo-event on branch `feat/events-management`; all others are in buzbo-landing-v2 on branch `feat/event-tickets`. Commit in the repo the file lives in.
- No new npm dependencies in either repo.
- Both repos point at the **production** database. Do not run the migration, do not write to the database, do not run `wrangler deploy`. Task 8 hands those over.
- Do not run `npm run build` in buzbo-event while its dev server is running: it corrupts the server's Vite cache. Typecheck with `npx tsc --noEmit -p .` and filter for the files touched.
- buzbo-landing-v2 has four untracked files that are not part of this work (`01 - Privacy Policy.md`, `02 - Terms and Conditions.md`, `public/phones-overlap-*.png`). Never `git add -A`; add files by name.
- The landing site holds the publishable key only. No service-role key, no writes.
- All times are shown in the event's timezone, never the visitor's.
- A URL from the database is rendered as an `href` or `src` only after `safeHttpUrl`.
- Files under `src/lib/events/` that have a test (`format.ts`, `types.ts`) must not import through `@/` or from `astro:*`; their relative imports carry the `.ts` extension and type imports use `import type`.
- Copy, exactly: tabs `Upcoming` and `Past`; empty states `No upcoming events right now.` and `No past events yet.`; button `Register`; disabled button `Tickets coming soon`; ended notice `This event has ended.`; map link `Open in Maps`.
- Price chip: `Free`, `€10`, `Free – €10`, `From €7.50` (en dash with spaces).
- End every commit message with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **An evening event in a zone ahead of UTC that crosses midnight UTC**, or one that ends after local midnight. Expected: it is grouped under its local day, and the time range names the next day rather than showing an end before the start. Tests in Task 3.
2. **A stored link that is not a web address** reaching an `href` (`javascript:…` in `external_url` or `map_url`, written by something other than the editor). Expected: no link is rendered; the button falls back to `Tickets coming soon`. Test in Task 3 (`safeHttpUrl`), used in Task 7.
3. **An event with free and paid tickets, or with none.** Expected: `Free – €10`, and no chip at all for none, never `€0` or `NaN`. Tests in Task 3.
4. **A published event whose end time has passed while the page is open in a tab**, and one with no end time. Expected: it moves to Past on the next load using its start, and its page shows the ended notice with no button. Tests in Task 3 (`isPast`, `splitByTime`).
5. **The database read failing or Supabase not configured.** Expected: the list shows its empty state and the detail page is a 404; no error text reaches the visitor. Handled in Task 4; checked by hand in Task 8.

---

### Task 1: The `external_url` column

**Files:**
- Create: `../buzbo-event/supabase/migrations/20261011020000_buzbo_events_external_url.sql`

**Interfaces:**
- Produces: `buzbo_events.external_url text null`.

- [ ] **Step 1: Write the migration**

```sql
-- Where "Register" goes while Buzbo does not sell the ticket itself.
--
-- ⚠️ ADDITIVE ONLY: one nullable column and one check on buzbo_events.
--
-- Stage 2 of ticket sales shows events on the landing site before payment
-- exists. Until it does, registration happens somewhere else (today: Luma) and
-- this column holds that address. The landing site renders it as a link, so
-- only a web address may be stored; buzbo-event checks that too, but this
-- table can be written by anything holding the service role.
--
-- The table-level SELECT granted to anon in 20261011010000 covers new columns.

alter table public.buzbo_events
  add column if not exists external_url text;

alter table public.buzbo_events
  drop constraint if exists buzbo_events_external_url_is_http;

alter table public.buzbo_events
  add constraint buzbo_events_external_url_is_http
  check (external_url is null or external_url ~* '^https?://');
```

- [ ] **Step 2: Commit (in buzbo-event)**

```bash
git add supabase/migrations/20261011020000_buzbo_events_external_url.sql
git commit -m "feat(events): a registration link for events sold elsewhere"
```

---

### Task 2: The registration link in buzbo-event

**Files:**
- Modify: `../buzbo-event/src/lib/events/types.ts` (`EventRow`, `EventInput`)
- Modify: `../buzbo-event/src/lib/events/validate.ts` (the `map_url` block in `parseEventInput`)
- Test: `../buzbo-event/src/lib/events/validate.test.ts`
- Modify: `../buzbo-event/src/components/dashboard/EventEditorContent.tsx`

**Interfaces:**
- Produces: `EventRow.external_url: string | null`; `EventInput.external_url?: string | null`; `PATCH /api/events/:id` accepts `external_url`.

- [ ] **Step 1: Write the failing test**

Append to `validate.test.ts`:

```ts
describe('parseEventInput: registration link', () => {
  it('stores a web address and clears on blank', () => {
    assert.deepEqual(parseEventInput({ external_url: ' https://luma.com/ibzxg7ig ' }), {
      ok: true,
      value: { external_url: 'https://luma.com/ibzxg7ig' },
    });
    assert.deepEqual(parseEventInput({ external_url: '' }), {
      ok: true,
      value: { external_url: null },
    });
  });

  it('refuses anything that is not http or https', () => {
    for (const external_url of ['javascript:alert(1)', 'luma.com/ibzxg7ig', 'mailto:a@b.c', 42]) {
      const parsed = parseEventInput({ external_url });
      assert.equal(parsed.ok, false, String(external_url));
    }
  });

  it('names the field in the refusal', () => {
    const parsed = parseEventInput({ external_url: 'luma.com/x' });
    assert.match(parsed.ok ? '' : parsed.error, /Registration link/);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test src/lib/events/validate.test.ts`
Expected: FAIL — the first test gets `{ ok: true, value: {} }`, because the key is ignored.

- [ ] **Step 3: Add the field to the types**

In `types.ts`, in `EventRow` directly after `map_url: string | null;`:

```ts
  /** Where Register goes while Buzbo does not sell the ticket itself. http(s) only. */
  external_url: string | null;
```

and in `EventInput` directly after `map_url?: string | null;`:

```ts
  external_url?: string | null;
```

- [ ] **Step 4: Parse it by the map link's rule**

In `validate.ts`, replace the whole `if (body.map_url !== undefined) { … }` block with:

```ts
  // The landing site renders these as hrefs, so only a web address may be stored.
  for (const [key, label] of URL_FIELDS) {
    const value = body[key];
    if (value === undefined) continue;
    if (value !== null && typeof value !== 'string') return fail(`${label} must be text or null.`);
    const url = emptyToNull(value);
    if (url && !isHttpUrl(url)) return fail(`${label} must start with http:// or https://.`);
    input[key] = url;
  }
```

and add, directly above `function isHttpUrl`:

```ts
const URL_FIELDS = [
  ['map_url', 'Map link'],
  ['external_url', 'Registration link'],
] as const;
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS, every file, including the existing map-link tests.

- [ ] **Step 6: Add the field to the editor**

In `EventEditorContent.tsx`:

In `interface FormState`, after `map_url: string;`:

```ts
  external_url: string;
```

In `toForm`, after `map_url: event.map_url ?? '',`:

```ts
    external_url: event.external_url ?? '',
```

In the PATCH body in `save`, after `map_url: form.map_url,`:

```ts
          external_url: form.external_url,
```

In the Tickets section, directly above `<div className="md:col-span-2">` that wraps `EventTicketTypesEditor`:

```tsx
        <Field
          label="Registration link"
          htmlFor="event-external-url"
          hint="Where Register sends people, for example the event's Luma page. Without it the button reads “Tickets coming soon”."
          className="md:col-span-2"
        >
          <Input
            id="event-external-url"
            type="url"
            value={form.external_url}
            onChange={(e) => update('external_url', e.target.value)}
            placeholder="https://luma.com/…"
          />
        </Field>
```

- [ ] **Step 7: Typecheck and commit (in buzbo-event)**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "lib/events|dashboard/Event"`
Expected: no output.

```bash
git add src/lib/events/types.ts src/lib/events/validate.ts src/lib/events/validate.test.ts src/components/dashboard/EventEditorContent.tsx
git commit -m "feat(events): edit an event's registration link"
```

---

### Task 3: Dates, prices and grouping as text

**Files:**
- Modify: `package.json` (add the `test` script)
- Create: `src/lib/events/types.ts`
- Create: `src/lib/events/format.ts`
- Test: `src/lib/events/format.test.ts`

**Interfaces:**
- Produces, from `types.ts`: `TicketPrice`, `TicketType`, `EventSummary`, `EventDetail`.
- Produces, from `format.ts`: `eventDayKey(iso, tz): string`; `formatDayShort(iso, tz): string` ("15 Oct"); `formatWeekday(iso, tz): string` ("Thursday"); `formatDayLong(iso, tz): string` ("Thursday, 15 October 2026"); `formatMonthShort(iso, tz): string` ("Oct"); `formatDayOfMonth(iso, tz): string` ("15"); `formatTime(iso, tz): string` ("17:00"); `formatTimeRange(startIso, endIso | null, tz): string`; `formatUtcOffset(iso, tz): string` ("GMT+2"); `formatPrice(cents, currency): string`; `priceLabel(tickets: TicketPrice[]): string | null`; `isPast(event: { starts_at: string; ends_at: string | null }, now: Date): boolean`; `splitByTime<T>(events: T[], now: Date): { upcoming: T[]; past: T[] }`; `groupByDay<T>(events: T[]): Array<{ key: string; events: T[] }>`; `safeHttpUrl(value: string | null | undefined): string | null`.

- [ ] **Step 1: Add the test script**

In `package.json`, in `"scripts"`, after the `"astro"` line (add the comma it needs):

```json
    "test": "node --test \"src/**/*.test.ts\""
```

- [ ] **Step 2: Write `src/lib/events/types.ts`**

```ts
// Rows of buzbo_events and buzbo_event_ticket_types, as the publishable key sees them:
// published events only. They are authored in buzbo-event (Landing Page → Events).

export interface TicketPrice {
  /** Integer cents. 0 is a free ticket. */
  price_cents: number;
  currency: string;
}

export interface TicketType extends TicketPrice {
  id: string;
  name: string;
  description: string | null;
  position: number;
}

/** What the list at /events needs. */
export interface EventSummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  cover_image_url: string | null;
  /** UTC. Shown in `timezone`, never in the visitor's. */
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  venue_name: string | null;
  city: string | null;
  host_name: string | null;
  ticket_types: TicketPrice[];
}

/** What the page at /events/<slug> needs. */
export interface EventDetail extends Omit<EventSummary, 'ticket_types'> {
  description_html: string | null;
  venue_address: string | null;
  map_url: string | null;
  /** Where Register goes while Buzbo does not sell the ticket itself. */
  external_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string;
  ticket_types: TicketType[];
}
```

- [ ] **Step 3: Write the failing test**

`src/lib/events/format.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  eventDayKey,
  formatDayLong,
  formatDayOfMonth,
  formatDayShort,
  formatMonthShort,
  formatPrice,
  formatTime,
  formatTimeRange,
  formatUtcOffset,
  formatWeekday,
  groupByDay,
  isPast,
  priceLabel,
  safeHttpUrl,
  splitByTime,
} from './format.ts';

const AMS = 'Europe/Amsterdam';
// 15 October 2026, 17:00–19:00 in Amsterdam (summer time, UTC+2).
const START = '2026-10-15T15:00:00.000Z';
const END = '2026-10-15T17:00:00.000Z';

describe('dates in the event timezone', () => {
  it('formats the day every way the pages need', () => {
    assert.equal(formatDayShort(START, AMS), '15 Oct');
    assert.equal(formatWeekday(START, AMS), 'Thursday');
    assert.equal(formatDayLong(START, AMS), 'Thursday, 15 October 2026');
    assert.equal(formatMonthShort(START, AMS), 'Oct');
    assert.equal(formatDayOfMonth(START, AMS), '15');
    assert.equal(formatDayOfMonth('2026-12-02T15:00:00.000Z', AMS), '2');
  });

  it('uses the local day when UTC is still on the day before or after', () => {
    // 00:30 on the 16th in Amsterdam is 22:30 UTC on the 15th.
    assert.equal(eventDayKey('2026-10-15T22:30:00.000Z', AMS), '2026-10-16');
    assert.equal(formatDayShort('2026-10-15T22:30:00.000Z', AMS), '16 Oct');
    // 20:00 on the 15th in New York is 00:00 UTC on the 16th.
    assert.equal(eventDayKey('2026-10-16T00:00:00.000Z', 'America/New_York'), '2026-10-15');
  });

  it('gives the same instant different days in different zones', () => {
    const iso = '2026-10-15T23:00:00.000Z';
    assert.equal(eventDayKey(iso, 'Europe/London'), '2026-10-16');
    assert.equal(eventDayKey(iso, 'America/New_York'), '2026-10-15');
  });
});

describe('times', () => {
  it('is a 24-hour clock in the event timezone', () => {
    assert.equal(formatTime(START, AMS), '17:00');
    assert.equal(formatTime('2026-10-15T22:05:00.000Z', AMS), '00:05');
    assert.equal(formatTime(START, 'Europe/London'), '16:00');
  });

  it('shows a range, or the start alone', () => {
    assert.equal(formatTimeRange(START, END, AMS), '17:00 – 19:00');
    assert.equal(formatTimeRange(START, null, AMS), '17:00');
  });

  it('names the next day when the event ends after midnight', () => {
    // 22:00 on the 15th to 01:00 on the 16th.
    assert.equal(
      formatTimeRange('2026-10-15T20:00:00.000Z', '2026-10-15T23:00:00.000Z', AMS),
      '22:00 – 16 Oct, 01:00',
    );
  });

  it('gives the offset from UTC on that date', () => {
    assert.equal(formatUtcOffset(START, AMS), 'GMT+2');
    assert.equal(formatUtcOffset('2026-12-02T15:00:00.000Z', AMS), 'GMT+1');
    assert.equal(formatUtcOffset('2026-12-02T15:00:00.000Z', 'Europe/London'), 'GMT');
    assert.equal(formatUtcOffset('2026-12-02T15:00:00.000Z', 'America/New_York'), 'GMT-5');
    assert.equal(formatUtcOffset(START, 'Asia/Kolkata'), 'GMT+5:30');
  });
});

describe('prices', () => {
  const eur = (price_cents: number) => ({ price_cents, currency: 'EUR' });

  it('formats one price', () => {
    assert.equal(formatPrice(0, 'EUR'), 'Free');
    assert.equal(formatPrice(1000, 'EUR'), '€10');
    assert.equal(formatPrice(750, 'EUR'), '€7.50');
    assert.equal(formatPrice(1999, 'EUR'), '€19.99');
  });

  it('summarises an event as a chip', () => {
    assert.equal(priceLabel([eur(0)]), 'Free');
    assert.equal(priceLabel([eur(0), eur(0)]), 'Free');
    assert.equal(priceLabel([eur(1000)]), '€10');
    assert.equal(priceLabel([eur(1000), eur(1000)]), '€10');
    assert.equal(priceLabel([eur(1000), eur(0)]), 'Free – €10');
    assert.equal(priceLabel([eur(1000), eur(750)]), 'From €7.50');
  });

  it('has no chip for an event with no tickets', () => {
    assert.equal(priceLabel([]), null);
  });
});

describe('past and upcoming', () => {
  const now = new Date('2026-10-15T16:00:00.000Z');
  const event = (id: string, starts_at: string, ends_at: string | null = null) => ({
    id,
    starts_at,
    ends_at,
    timezone: AMS,
  });

  it('is past once the end has gone by, so an event under way is still upcoming', () => {
    assert.equal(isPast(event('a', START, END), now), false);
    assert.equal(isPast(event('a', START, END), new Date('2026-10-15T17:00:01.000Z')), true);
  });

  it('falls back on the start when there is no end', () => {
    assert.equal(isPast(event('a', START), now), true);
    assert.equal(isPast(event('a', '2026-10-15T16:30:00.000Z'), now), false);
  });

  it('splits, soonest upcoming first and most recent past first', () => {
    const { upcoming, past } = splitByTime(
      [
        event('dec', '2026-12-02T15:00:00.000Z'),
        event('sep', '2026-09-01T15:00:00.000Z'),
        event('nov', '2026-11-04T15:00:00.000Z'),
        event('aug', '2026-08-01T15:00:00.000Z'),
      ],
      now,
    );
    assert.deepEqual(upcoming.map((e) => e.id), ['nov', 'dec']);
    assert.deepEqual(past.map((e) => e.id), ['sep', 'aug']);
  });

  it('groups by local day, keeping the order given', () => {
    const groups = groupByDay([
      event('a', '2026-10-15T15:00:00.000Z'),
      event('b', '2026-10-15T18:00:00.000Z'),
      // 00:30 on the 16th in Amsterdam.
      event('c', '2026-10-15T22:30:00.000Z'),
    ]);
    assert.deepEqual(
      groups.map((g) => [g.key, g.events.map((e) => e.id)]),
      [
        ['2026-10-15', ['a', 'b']],
        ['2026-10-16', ['c']],
      ],
    );
    assert.deepEqual(groupByDay([]), []);
  });
});

describe('safeHttpUrl', () => {
  it('passes web addresses through', () => {
    assert.equal(safeHttpUrl('https://luma.com/ibzxg7ig'), 'https://luma.com/ibzxg7ig');
    assert.equal(safeHttpUrl('http://example.com/a?b=1'), 'http://example.com/a?b=1');
  });

  it('gives null for anything else', () => {
    for (const value of [
      null,
      undefined,
      '',
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'data:text/html,x',
      'luma.com/ibzxg7ig',
      '//evil.example',
      'mailto:a@b.c',
    ]) {
      assert.equal(safeHttpUrl(value), null, String(value));
    }
  });
});
```

- [ ] **Step 4: Run it to see it fail**

Run: `node --test src/lib/events/format.test.ts`
Expected: FAIL, `Cannot find module ... format.ts`

- [ ] **Step 5: Write `src/lib/events/format.ts`**

```ts
// The only place an event's date or price becomes text. Everything is rendered in the
// event's own timezone — the time on the door — never the visitor's. The locale is fixed
// and the text is assembled from parts, so the output does not depend on which runtime
// (Workers, Node) or which ICU version formats it.

import type { TicketPrice } from './types.ts';

type Parts = Partial<Record<Intl.DateTimeFormatPartTypes, string>>;

function partsOf(iso: string, timeZone: string, options: Intl.DateTimeFormatOptions): Parts {
  const parts: Parts = {};
  const formatted = new Intl.DateTimeFormat('en-GB', { timeZone, ...options }).formatToParts(
    new Date(iso),
  );
  for (const part of formatted) parts[part.type] = part.value;
  return parts;
}

/** `YYYY-MM-DD` of the event's local day. Events on the same key share a date heading. */
export function eventDayKey(iso: string, timeZone: string): string {
  const p = partsOf(iso, timeZone, { year: 'numeric', month: '2-digit', day: '2-digit' });
  return `${p.year}-${p.month}-${p.day}`;
}

export function formatDayOfMonth(iso: string, timeZone: string): string {
  return partsOf(iso, timeZone, { day: 'numeric' }).day ?? '';
}

export function formatMonthShort(iso: string, timeZone: string): string {
  return partsOf(iso, timeZone, { month: 'short' }).month ?? '';
}

export function formatWeekday(iso: string, timeZone: string): string {
  return partsOf(iso, timeZone, { weekday: 'long' }).weekday ?? '';
}

/** "15 Oct" */
export function formatDayShort(iso: string, timeZone: string): string {
  return `${formatDayOfMonth(iso, timeZone)} ${formatMonthShort(iso, timeZone)}`;
}

/** "Thursday, 15 October 2026" */
export function formatDayLong(iso: string, timeZone: string): string {
  const p = partsOf(iso, timeZone, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`;
}

/** "17:00" */
export function formatTime(iso: string, timeZone: string): string {
  const p = partsOf(iso, timeZone, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.hour}:${p.minute}`;
}

/** "17:00 – 19:00". An event that ends on a later local day names it, so the end never
 *  reads as earlier than the start: "22:00 – 16 Oct, 01:00". */
export function formatTimeRange(startIso: string, endIso: string | null, timeZone: string): string {
  const start = formatTime(startIso, timeZone);
  if (!endIso) return start;
  const end = formatTime(endIso, timeZone);
  return eventDayKey(startIso, timeZone) === eventDayKey(endIso, timeZone)
    ? `${start} – ${end}`
    : `${start} – ${formatDayShort(endIso, timeZone)}, ${end}`;
}

/** "GMT+2" on that date in that zone. Worked out by arithmetic, because the short zone
 *  name Intl gives ("CEST", "GMT+2") varies with locale and ICU version. */
export function formatUtcOffset(iso: string, timeZone: string): string {
  const ms = Math.floor(Date.parse(iso) / 60_000) * 60_000;
  const p = partsOf(iso, timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const wall = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
  );
  const minutes = Math.round((wall - ms) / 60_000);
  if (minutes === 0) return 'GMT';
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  return `GMT${minutes > 0 ? '+' : '-'}${hours}${rest ? `:${String(rest).padStart(2, '0')}` : ''}`;
}

/** "Free", "€10", "€7.50". Whole amounts drop the decimals. */
export function formatPrice(cents: number, currency: string): string {
  if (cents === 0) return 'Free';
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** The chip on an event card. Null for an event with no ticket types, which gets no chip
 *  rather than a wrong price. Assumes one currency per event, which the editor ensures. */
export function priceLabel(tickets: TicketPrice[]): string | null {
  if (tickets.length === 0) return null;
  const currency = tickets[0].currency;
  const cents = tickets.map((ticket) => ticket.price_cents);
  const min = Math.min(...cents);
  const max = Math.max(...cents);
  if (min === max) return formatPrice(min, currency);
  if (min === 0) return `Free – ${formatPrice(max, currency)}`;
  return `From ${formatPrice(min, currency)}`;
}

/** Past once its end has gone by; with no end, once it has started. An event under way
 *  is still upcoming. */
export function isPast(event: { starts_at: string; ends_at: string | null }, now: Date): boolean {
  return Date.parse(event.ends_at ?? event.starts_at) < now.getTime();
}

/** Upcoming soonest first, past most recent first. */
export function splitByTime<T extends { starts_at: string; ends_at: string | null }>(
  events: T[],
  now: Date,
): { upcoming: T[]; past: T[] } {
  const byStart = (a: T, b: T) => Date.parse(a.starts_at) - Date.parse(b.starts_at);
  return {
    upcoming: events.filter((event) => !isPast(event, now)).sort(byStart),
    past: events
      .filter((event) => isPast(event, now))
      .sort((a, b) => byStart(b, a)),
  };
}

/** Consecutive events on the same local day, in the order given. */
export function groupByDay<T extends { starts_at: string; timezone: string }>(
  events: T[],
): Array<{ key: string; events: T[] }> {
  const groups: Array<{ key: string; events: T[] }> = [];
  for (const event of events) {
    const key = eventDayKey(event.starts_at, event.timezone);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.events.push(event);
    else groups.push({ key, events: [event] });
  }
  return groups;
}

/** The value itself when it is an http or https address, otherwise null. Every link and
 *  image address that comes out of the database goes through this before it is rendered:
 *  the editor checks them, but the table can be written by anything holding the service
 *  role. */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json src/lib/events/types.ts src/lib/events/format.ts src/lib/events/format.test.ts
git commit -m "feat(events): dates, prices and day groups as text, in the event's timezone"
```

---

### Task 4: Reading published events

**Files:**
- Create: `src/lib/events/queries.ts`

**Interfaces:**
- Consumes: `getPublicSupabase`, `isSupabaseConfigured` from `src/lib/supabase.ts`; Task 3's types.
- Produces: `listPublishedEvents(): Promise<EventSummary[]>` (never throws; `[]` on any failure); `getPublishedEvent(slug: string): Promise<EventDetail | null>` (never throws; `null` on any failure, on a draft, and on an event with no start time), with `ticket_types` sorted by `position`.

- [ ] **Step 1: Write `src/lib/events/queries.ts`**

```ts
import { getPublicSupabase, isSupabaseConfigured } from '../supabase';
import type { EventDetail, EventSummary } from './types';

const EVENTS_TABLE = 'buzbo_events';

const SUMMARY_COLUMNS =
  'id, title, slug, summary, cover_image_url, starts_at, ends_at, timezone, venue_name, city, host_name, ticket_types:buzbo_event_ticket_types(price_cents, currency)';

const DETAIL_COLUMNS =
  'id, title, slug, summary, description_html, cover_image_url, starts_at, ends_at, timezone, venue_name, venue_address, city, map_url, host_name, external_url, seo_title, seo_description, updated_at, ticket_types:buzbo_event_ticket_types(id, name, description, price_cents, currency, position)';

// RLS already hides drafts from the publishable key. The status filter is repeated so the
// query says what it means, and still means it if this file is ever pointed at a key
// that sees more.

/** Every published event that has a start time. Never throws: a visitor gets the empty
 *  state, not a database error. */
export async function listPublishedEvents(): Promise<EventSummary[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await getPublicSupabase()
    .from(EVENTS_TABLE)
    .select(SUMMARY_COLUMNS)
    .eq('status', 'published')
    .not('starts_at', 'is', null)
    .order('starts_at', { ascending: true });

  if (error) {
    console.error('events: could not list published events', error);
    return [];
  }
  return (data ?? []) as unknown as EventSummary[];
}

/** One published event by slug, with its ticket types in display order. Null for a draft,
 *  an unknown slug, an event with no start time, or a failed read — all of which the page
 *  answers with a 404. */
export async function getPublishedEvent(slug: string): Promise<EventDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await getPublicSupabase()
    .from(EVENTS_TABLE)
    .select(DETAIL_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .not('starts_at', 'is', null)
    .maybeSingle();

  if (error) {
    console.error('events: could not load event', slug, error);
    return null;
  }
  if (!data) return null;

  const event = data as unknown as EventDetail;
  return { ...event, ticket_types: [...event.ticket_types].sort((a, b) => a.position - b.position) };
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit -p . 2>&1 | grep "lib/events"`
Expected: no output.

```bash
git add src/lib/events/queries.ts
git commit -m "feat(events): read published events with the publishable key"
```

---

### Task 5: Layout, SEO entry and header links

**Files:**
- Modify: `src/layouts/BlogLayout.astro`
- Modify: `src/lib/seo.ts`
- Modify: `src/components/SiteHeader.astro` (two EVENTS links)

**Interfaces:**
- Produces: `BlogLayout` props `titleSuffix?: string` (default `'Buzbo Blog'`) and `jsonLd?: Record<string, unknown>`; `PAGE_SEO.events` with `title`, `description`, `keywords`, `image`.

- [ ] **Step 1: Two new props on `BlogLayout`**

In the `Props` interface, after `footerWaitlistAnchor?: boolean;`:

```ts
	/** After the "·" in the page title. Event pages are not the blog. */
	titleSuffix?: string;
	/** Structured data for a page that is not an article. Overrides the Article block. */
	jsonLd?: Record<string, unknown>;
```

In the destructuring, after `footerWaitlistAnchor = true,`:

```ts
	titleSuffix = 'Buzbo Blog',
	jsonLd: pageJsonLd,
```

Replace `const fullTitle = \`${title} · Buzbo Blog\`;` with:

```ts
const fullTitle = `${title} · ${titleSuffix}`;
```

Rename the computed `const jsonLd =` to `const articleJsonLd =`, and in the `<Seo …>` call replace `jsonLd={jsonLd}` with:

```astro
			jsonLd={pageJsonLd ?? articleJsonLd}
```

- [ ] **Step 2: The SEO entry**

In `src/lib/seo.ts`, in `PAGE_SEO`, after the `blog` entry:

```ts
	events: {
		title: 'Events',
		description:
			'Buzbo networking evenings across the Netherlands. Three introductions matched in advance, so you meet the people you should meet.',
		keywords: `${DEFAULT_KEYWORDS}, events, networking events, meetups`,
		image: '/blog-banner.png',
	},
```

- [ ] **Step 3: Point the header at `/events`**

In `src/components/SiteHeader.astro` there are exactly two occurrences of

```
href="https://luma.com/user/usr-7Sakk30HvU6AeaI" target="_blank"
```

Replace both with:

```
href="/events"
```

- [ ] **Step 4: Check and commit**

Run: `grep -c 'href="/events"' src/components/SiteHeader.astro; grep -c luma.com src/components/SiteHeader.astro; npm run build`
Expected: `2`, then `0`, then the build completes.

```bash
git add src/layouts/BlogLayout.astro src/lib/seo.ts src/components/SiteHeader.astro
git commit -m "feat(events): the header's Events link stays on the site"
```

---

### Task 6: The list at `/events`

**Files:**
- Create: `src/components/events/EventCard.astro`
- Create: `src/pages/events/index.astro`

**Interfaces:**
- Consumes: `listPublishedEvents`; `formatDayShort`, `formatWeekday`, `formatTime`, `groupByDay`, `priceLabel`, `safeHttpUrl`, `splitByTime`; `BlogLayout` with `titleSuffix`; `PAGE_SEO.events`.
- Produces: the page `/events` and `/events?period=past`; `EventCard` with the prop `event: EventSummary`.

- [ ] **Step 1: Write `src/components/events/EventCard.astro`**

```astro
---
import { formatTime, priceLabel, safeHttpUrl } from '../../lib/events/format';
import type { EventSummary } from '../../lib/events/types';

interface Props {
	event: EventSummary;
}

const { event } = Astro.props;
const place = [event.venue_name, event.city].filter(Boolean).join(', ');
const price = priceLabel(event.ticket_types);
const cover = safeHttpUrl(event.cover_image_url);
---

<a
	href={`/events/${event.slug}`}
	class="group flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy sm:p-5"
>
	<div class="min-w-0 flex-1">
		<p class="text-sm font-medium text-muted">
			<time datetime={event.starts_at}>{formatTime(event.starts_at, event.timezone)}</time>
		</p>
		<h2 class="mt-1 text-lg font-bold leading-snug text-ink group-hover:text-burgundy sm:text-xl">{event.title}</h2>
		{event.host_name ? <p class="mt-2 text-sm text-muted">By {event.host_name}</p> : null}
		{place ? (
			<p class="mt-1 flex items-center gap-1.5 text-sm text-muted">
				<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" class="size-4 shrink-0">
					<path fill-rule="evenodd" clip-rule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
				</svg>
				<span class="truncate">{place}</span>
			</p>
		) : null}
		{price ? (
			<p class="mt-3 inline-flex rounded-full bg-tint px-2.5 py-1 text-xs font-semibold text-burgundy">{price}</p>
		) : null}
	</div>
	{cover ? (
		<img src={cover} alt="" loading="lazy" class="size-24 shrink-0 rounded-xl object-cover ring-1 ring-line sm:size-32" />
	) : (
		<div class="size-24 shrink-0 rounded-xl bg-beige ring-1 ring-line sm:size-32" aria-hidden="true"></div>
	)}
</a>
```

- [ ] **Step 2: Write `src/pages/events/index.astro`**

```astro
---
import EventCard from '../../components/events/EventCard.astro';
import BlogLayout from '../../layouts/BlogLayout.astro';
import { formatDayShort, formatWeekday, groupByDay, splitByTime } from '../../lib/events/format';
import { listPublishedEvents } from '../../lib/events/queries';
import { PAGE_SEO } from '../../lib/seo';

export const prerender = false;

const period = Astro.url.searchParams.get('period') === 'past' ? 'past' : 'upcoming';
const { upcoming, past } = splitByTime(await listPublishedEvents(), new Date());
const days = groupByDay(period === 'past' ? past : upcoming);

const tab = 'rounded-full px-4 py-1.5 transition';
const tabOn = 'bg-white text-ink shadow-sm';
const tabOff = 'text-muted hover:text-ink';
---

<BlogLayout
	title={PAGE_SEO.events.title}
	description={PAGE_SEO.events.description}
	keywords={PAGE_SEO.events.keywords}
	image={PAGE_SEO.events.image}
	titleSuffix="Buzbo"
>
	<section class="mx-auto max-w-4xl px-6 pt-36 pb-20 lg:px-8 lg:pt-44">
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 class="font-sans text-4xl font-extrabold tracking-tight text-burgundy sm:text-5xl">Events</h1>
				<p class="mt-3 max-w-xl text-base/7 text-muted">
					Evenings where the introductions are made before you arrive. Valuable connections, not random small talk.
				</p>
			</div>
			<nav aria-label="Which events" class="inline-flex rounded-full bg-beige p-1 text-sm font-semibold">
				<a href="/events" aria-current={period === 'upcoming' ? 'page' : undefined} class:list={[tab, period === 'upcoming' ? tabOn : tabOff]}>Upcoming</a>
				<a href="/events?period=past" aria-current={period === 'past' ? 'page' : undefined} class:list={[tab, period === 'past' ? tabOn : tabOff]}>Past</a>
			</nav>
		</div>

		{days.length === 0 ? (
			<p class="mt-12 rounded-2xl bg-white px-6 py-12 text-center text-muted ring-1 ring-line">
				{period === 'past' ? 'No past events yet.' : 'No upcoming events right now.'}
			</p>
		) : (
			<ol class="mt-12">
				{days.map((day) => (
					<li class="grid gap-x-6 sm:grid-cols-[7.5rem_1fr]">
						<div class="pb-3 sm:pb-0 sm:pt-1">
							<p class="font-semibold text-ink">{formatDayShort(day.events[0].starts_at, day.events[0].timezone)}</p>
							<p class="text-sm text-muted">{formatWeekday(day.events[0].starts_at, day.events[0].timezone)}</p>
						</div>
						<div class="relative border-l border-dashed border-line pb-10 pl-6">
							<span class="absolute -left-[5px] top-2 size-2.5 rounded-full bg-burgundy/40" aria-hidden="true"></span>
							<div class="flex flex-col gap-4">
								{day.events.map((event) => <EventCard event={event} />)}
							</div>
						</div>
					</li>
				))}
			</ol>
		)}
	</section>
</BlogLayout>
```

- [ ] **Step 3: Build and commit**

Run: `npm run build`
Expected: completes.

```bash
git add src/components/events/EventCard.astro src/pages/events/index.astro
git commit -m "feat(events): list upcoming and past events by day"
```

---

### Task 7: The event page

**Files:**
- Create: `src/pages/events/[slug].astro`

**Interfaces:**
- Consumes: `getPublishedEvent`; `formatDayLong`, `formatDayOfMonth`, `formatMonthShort`, `formatPrice`, `formatTimeRange`, `formatUtcOffset`, `isPast`, `safeHttpUrl`; `BlogLayout` with `titleSuffix` and `jsonLd`; `PAGE_SEO.events`; the `.blog-prose` class in `src/styles/global.css`.
- Produces: the page `/events/<slug>`; 404 when `getPublishedEvent` returns null.

- [ ] **Step 1: Write `src/pages/events/[slug].astro`**

```astro
---
import BlogLayout from '../../layouts/BlogLayout.astro';
import {
	formatDayLong,
	formatDayOfMonth,
	formatMonthShort,
	formatPrice,
	formatTimeRange,
	formatUtcOffset,
	isPast,
	safeHttpUrl,
} from '../../lib/events/format';
import { getPublishedEvent } from '../../lib/events/queries';
import { PAGE_SEO, SITE_NAME } from '../../lib/seo';

export const prerender = false;

const { slug } = Astro.params;
const event = slug ? await getPublishedEvent(slug) : null;

if (!event) {
	return new Response(null, { status: 404, statusText: 'Not Found' });
}

const zone = event.timezone;
const canonical = new URL(`/events/${event.slug}`, Astro.url.origin).href;
const ended = isPast(event, new Date());

// Everything below comes out of the database and ends up in an href or a src.
const registerUrl = safeHttpUrl(event.external_url);
const mapUrl = safeHttpUrl(event.map_url);
const cover = safeHttpUrl(event.cover_image_url);

const place = [event.venue_name, event.city].filter(Boolean).join(', ');
const dayLong = formatDayLong(event.starts_at, zone);
const timeRange = `${formatTimeRange(event.starts_at, event.ends_at, zone)} · ${formatUtcOffset(event.starts_at, zone)}`;
const pageTitle = event.seo_title || event.title;
const pageDescription =
	event.seo_description || event.summary || [dayLong, place].filter(Boolean).join(' · ');

const jsonLd = {
	'@context': 'https://schema.org',
	'@type': 'Event',
	name: event.title,
	description: pageDescription,
	startDate: event.starts_at,
	endDate: event.ends_at ?? undefined,
	eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
	eventStatus: 'https://schema.org/EventScheduled',
	image: cover ?? undefined,
	url: canonical,
	location: event.venue_name
		? {
				'@type': 'Place',
				name: event.venue_name,
				address: event.venue_address ?? event.city ?? undefined,
			}
		: undefined,
	organizer: { '@type': 'Organization', name: event.host_name ?? SITE_NAME },
	offers: event.ticket_types.map((ticket) => ({
		'@type': 'Offer',
		name: ticket.name,
		price: (ticket.price_cents / 100).toFixed(2),
		priceCurrency: ticket.currency,
		url: registerUrl ?? canonical,
	})),
};

const tile = 'flex size-11 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-line';
---

<BlogLayout
	title={pageTitle}
	description={pageDescription}
	keywords={PAGE_SEO.events.keywords}
	canonical={canonical}
	image={cover ?? PAGE_SEO.events.image}
	titleSuffix="Buzbo Events"
	jsonLd={jsonLd}
>
	<article class="mx-auto max-w-5xl px-6 pt-36 pb-20 lg:px-8 lg:pt-44">
		<a href="/events" class="text-sm font-semibold text-primary-crimson hover:underline">← All events</a>

		<div class="mt-6 grid gap-10 lg:grid-cols-[22rem_1fr]">
			<aside class="lg:sticky lg:top-40 lg:self-start">
				{cover ? (
					<img src={cover} alt={event.title} class="aspect-square w-full rounded-2xl object-cover ring-1 ring-line" />
				) : (
					<div class="aspect-square w-full rounded-2xl bg-beige ring-1 ring-line" aria-hidden="true"></div>
				)}
				{event.host_name ? (
					<div class="mt-6 border-t border-line pt-4">
						<p class="text-xs font-semibold uppercase tracking-wide text-muted">Hosted by</p>
						<p class="mt-1 font-semibold text-ink">{event.host_name}</p>
					</div>
				) : null}
			</aside>

			<div class="min-w-0">
				<h1 class="font-sans text-3xl font-extrabold tracking-tight text-burgundy sm:text-4xl">{event.title}</h1>

				<div class="mt-6 flex flex-col gap-4">
					<div class="flex items-center gap-3">
						<div class={tile} aria-hidden="true">
							<span class="w-full bg-beige text-center text-[10px] font-semibold uppercase leading-4 text-muted">{formatMonthShort(event.starts_at, zone)}</span>
							<span class="text-base font-bold leading-6 text-ink">{formatDayOfMonth(event.starts_at, zone)}</span>
						</div>
						<div>
							<p class="font-semibold text-ink"><time datetime={event.starts_at}>{dayLong}</time></p>
							<p class="text-sm text-muted">{timeRange}</p>
						</div>
					</div>

					{place ? (
						<div class="flex items-center gap-3">
							<div class={tile} aria-hidden="true">
								<svg viewBox="0 0 20 20" fill="currentColor" class="size-5 text-muted">
									<path fill-rule="evenodd" clip-rule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" />
								</svg>
							</div>
							<div>
								<p class="font-semibold text-ink">{event.venue_name ?? event.city}</p>
								{event.venue_name && event.city ? <p class="text-sm text-muted">{event.city}</p> : null}
							</div>
						</div>
					) : null}
				</div>

				<section aria-labelledby="tickets-heading" class="mt-8 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-line">
					<h2 id="tickets-heading" class="text-xs font-semibold uppercase tracking-wide text-muted">Tickets</h2>
					{event.ticket_types.length > 0 ? (
						<ul class="mt-3 divide-y divide-line">
							{event.ticket_types.map((ticket) => (
								<li class="flex items-start justify-between gap-4 py-3">
									<div class="min-w-0">
										<p class="font-semibold text-ink">{ticket.name}</p>
										{ticket.description ? <p class="mt-0.5 text-sm text-muted">{ticket.description}</p> : null}
									</div>
									<p class="shrink-0 font-semibold text-ink">{formatPrice(ticket.price_cents, ticket.currency)}</p>
								</li>
							))}
						</ul>
					) : null}
					{ended ? (
						<p class="mt-4 rounded-xl bg-beige px-4 py-3 text-center text-sm font-semibold text-muted">This event has ended.</p>
					) : registerUrl ? (
						<a
							href={registerUrl}
							target="_blank"
							rel="noopener"
							class="mt-4 flex w-full items-center justify-center rounded-full bg-primary-crimson px-7 py-3 text-base font-semibold text-white transition hover:bg-primary-crimson/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-burgundy"
						>
							Register
						</a>
					) : (
						<p class="mt-4 rounded-full bg-beige px-7 py-3 text-center text-base font-semibold text-disabled">Tickets coming soon</p>
					)}
				</section>

				{event.description_html ? (
					<section aria-labelledby="about-heading" class="mt-10">
						<h2 id="about-heading" class="border-b border-line pb-2 text-sm font-semibold text-muted">About this event</h2>
						{/* Written in buzbo-event's editor, behind the admin password, and trusted
						    as the blog's article bodies are. */}
						<div class="blog-prose mt-4" set:html={event.description_html} />
					</section>
				) : null}

				{place || event.venue_address ? (
					<section aria-labelledby="location-heading" class="mt-10">
						<h2 id="location-heading" class="border-b border-line pb-2 text-sm font-semibold text-muted">Location</h2>
						{event.venue_name ? <p class="mt-4 font-semibold text-ink">{event.venue_name}</p> : null}
						{event.venue_address ? <p class="mt-1 text-muted">{event.venue_address}</p> : null}
						{!event.venue_address && event.city ? <p class="mt-1 text-muted">{event.city}</p> : null}
						{mapUrl ? (
							<a href={mapUrl} target="_blank" rel="noopener" class="mt-3 inline-block text-sm font-semibold text-primary-crimson underline underline-offset-2">Open in Maps</a>
						) : null}
					</section>
				) : null}
			</div>
		</div>
	</article>
</BlogLayout>
```

- [ ] **Step 2: Test, build and commit**

Run: `npm test && npm run build`
Expected: tests pass; build completes.

```bash
git add "src/pages/events/[slug].astro"
git commit -m "feat(events): a page per event with tickets and a way to register"
```

---

### Task 8: Hand over and look at it

Nothing here can be seen until the migration has run and at least one event is published.

- [ ] **Step 1: Hand the migration to Tommy**

Say: "Run `buzbo-event/supabase/migrations/20261011020000_buzbo_events_external_url.sql` in the Supabase SQL editor. It adds one nullable column and one check." Wait for confirmation.

- [ ] **Step 2: Fill in the Luma links**

With Tommy's go-ahead, set `external_url` on the seven imported events to the Luma page each came from (`https://luma.com/<id>`), through the service role. This is a write to production: say exactly which rows before doing it.

- [ ] **Step 3: Publish**

Tommy publishes the events he wants live from the buzbo-event editor. Publishing through the editor is also the first real run of that form.

- [ ] **Step 4: Walk the pages**

`astro dev --background` in buzbo-landing-v2, then:

1. `/events` lists the published events under their Amsterdam dates, soonest first, each with the right chip (`Free – €10` for Arnhem, `€10` for the 4 November Utrecht event, `Free – €7.50` for Microlab).
2. `/events?period=past` shows `No past events yet.`
3. A card opens `/events/<slug>`. The date block reads `Thursday, 15 October 2026` and `17:00 – 19:00 · GMT+2`; the December events read `GMT+1`.
4. Register opens the Luma page in a new tab. An event with no link shows `Tickets coming soon`.
5. A draft's slug and `/events/does-not-exist` answer 404.
6. At 390px wide the cover is on top and nothing overflows sideways.
7. The header's EVENTS link, desktop and mobile menu, opens `/events` in the same tab.
8. `/blog` and one article still read "· Buzbo Blog" in the tab title.

- [ ] **Step 5: Record it**

In `buzbo-vault/`, which sits outside both repos: update `Architecture/Services/buzbo-event.md` (routes, the `/api/events` allowlist row, the two tables — this also closes Task 9 of the stage 1 plan) and `Home.md`, whose "Out of scope" note says the landing sites have no shared data layer. That stopped being true with the blog and is plainly false now. Add both tables to `SUPABASE.md`.

- [ ] **Step 6: Hand over the deploys**

Say: "Deploy buzbo-event first (`npm run deploy`), then buzbo-landing-v2 (`npm run deploy`). The landing's header stops linking to Luma the moment it deploys, so publish the events first." Do not run either.

# Event pages — design

Date: 2026-10-11
Status: approved in conversation, awaiting review of this document
Services: buzbo-landing-v2 (two public pages) and buzbo-event (one column, one editor
field). Stage 2 of ticket sales; stage 1 is
`buzbo-event/docs/superpowers/specs/2026-10-11-events-management-design.md`.

## Purpose

Show the events authored in buzbo-event on the landing site: a list at `/events` and a
page per event at `/events/<slug>`, laid out like Luma. Payment is stage 3. Until then
the Register button sends people to the event's page on Luma, where registration already
works.

Audience: anyone on the internet, signed out.

Success: someone follows a shared link to `/events/<slug>`, sees when and where the event
is and what a ticket costs, and reaches registration in one click. The header's EVENTS
link opens the list instead of Buzbo's Luma profile.

## Out of scope

- Checkout, orders, issued tickets. Stage 3.
- Sold-out and spots-left. Nothing counts sales yet.
- An embedded map. It needs an API key; the page links out to the pasted maps link.
- Add-to-calendar, share buttons, filters by city, search, pagination.
- Moving cover images off Luma's CDN. Each event's cover is replaced by hand in the
  editor.

## Data

One additive migration in buzbo-event,
`supabase/migrations/20261011020000_buzbo_events_external_url.sql`:

- `buzbo_events.external_url text null`, with a check that it starts with `http://` or
  `https://`. It is where Register goes while Buzbo does not sell the ticket itself.
- The table-level `select` grant to `anon` already covers a new column.

buzbo-event's editor gets a "Registration link" field in the Tickets section, parsed by
the same rule as the map link. The seven imported events get their Luma URL.

The landing site reads with the publishable key, as it does for articles. RLS shows it
published events and their ticket types only.

## Pages

### `/events`

A timeline grouped by day, in the event's own timezone:

- Left column: the date ("15 Oct") and weekday. Right: one card per event that day.
- Card: start time, title, "By <host>", venue and city, a price chip, cover thumbnail.
  The whole card links to the event.
- Two tabs, Upcoming (default, soonest first) and Past (`?period=past`, most recent
  first). An event is past once its end time has gone by; without an end time, its start.
- Price chip: `Free` when every ticket is free, `€10` for one price, `Free – €10` when
  free and paid tickets are both offered, `From €7.50` when the cheapest is paid.
- Empty states: "No upcoming events right now." and "No past events yet."

### `/events/<slug>`

Two columns on desktop, one on a phone with the cover first.

- Left, sticky: the cover, then "Hosted by <host>".
- Right: title; a date block (month and day tile, full date, time range with the UTC
  offset); a location block (venue, city); the registration card; About; Location.
- Registration card: each ticket type with its description and price, and one Register
  button that opens `external_url` in a new tab. With no link the button is disabled and
  reads "Tickets coming soon". A past event shows "This event has ended." and no button.
- About: the stored description HTML.
- Location: venue, address, and "Open in Maps" when a map link is set.
- A draft, an unknown slug, or an event with no start time is a 404.

### Around the pages

- `SiteHeader`: both EVENTS links (desktop and mobile menu) point to `/events`.
- `BlogLayout` appends "· Buzbo Blog" to every title. It gets a `titleSuffix` prop so
  event pages read "· Buzbo Events", and a `jsonLd` prop so the detail page can supply
  schema.org `Event` data. Blog pages pass neither and are unchanged.
- The detail page's Open Graph image is the cover.

## Rules

- All times are shown in the event's timezone, never the visitor's.
- A link taken from the database (`external_url`, `map_url`) is rendered as an `href`
  only if it is http or https, checked again on the landing side.
- The description is rendered as raw HTML, as article bodies are. It is written only
  through buzbo-event's editor, behind `ADMIN_PASSWORD`, and is treated as trusted.
  Whoever holds that password can put script on a public page; that is already true of
  the blog.
- A failed read renders the empty state on the list and a 404 on the detail page, and
  logs the error. The site never shows a database error to a visitor.

## Structure

```
buzbo-landing-v2/src/
  lib/events/types.ts        EventSummary, EventDetail, TicketType
  lib/events/format.ts       dates, times, prices, grouping, safeHttpUrl   (pure)
  lib/events/format.test.ts  node --test
  lib/events/queries.ts      listPublishedEvents, getPublishedEvent
  components/events/EventCard.astro
  pages/events/index.astro
  pages/events/[slug].astro
```

`format.ts` is the only place a date or a price becomes text. It uses `Intl` with a fixed
locale and reads `formatToParts`, so output does not depend on the runtime's defaults.

## Testing

`npm test` (added: `node --test "src/**/*.test.ts"`, no new dependency) covers
`format.ts`: day keys across midnight in the event's zone, time ranges including one
that ends the next day, UTC offsets in winter and summer, every price-chip case, the
past/upcoming split, and `safeHttpUrl` against `javascript:` and scheme-less input.

By hand: publish two events in buzbo-event, one upcoming and one edited to be past, and
check the list, both tabs, the detail page at phone and desktop width, a draft's URL
(404), and the Register link.

## Rollout

1. Run the migration.
2. Deploy buzbo-event (editor field).
3. Fill in the Luma links and publish the events.
4. Deploy buzbo-landing-v2.

Rollback of the landing is a redeploy of the previous version; the header link would
then point at Luma again.

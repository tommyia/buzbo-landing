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

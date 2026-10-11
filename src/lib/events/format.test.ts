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

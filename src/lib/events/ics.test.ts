import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { eventIcs } from './ics.ts';

const event = {
  id: '9a8bec83-0000-4000-8000-000000000001',
  title: 'Buzbo x Microlab',
  summary: null,
  starts_at: '2026-10-29T16:00:00+00:00',
  ends_at: '2026-10-29T18:00:00+00:00',
  venue_name: 'Microlab Eindhoven',
  venue_address: 'Strijp-S, Eindhoven',
  city: 'Eindhoven',
};
const url = 'https://buzbo.com/events/buzbo-x-microlab';
const NOW = new Date('2026-10-24T10:00:00Z');

function lines(ics: string): string[] {
  return ics.split('\r\n');
}

describe('eventIcs', () => {
  it('is one VEVENT in UTC, with CRLF line ends', () => {
    const ics = eventIcs(event, url, NOW);
    assert.ok(ics.endsWith('\r\n'));
    const l = lines(ics);
    assert.equal(l[0], 'BEGIN:VCALENDAR');
    assert.ok(l.includes('BEGIN:VEVENT'));
    assert.ok(l.includes('DTSTART:20261029T160000Z'));
    assert.ok(l.includes('DTEND:20261029T180000Z'));
    assert.ok(l.includes('DTSTAMP:20261024T100000Z'));
    assert.ok(l.includes(`UID:${event.id}@buzbo.com`));
    assert.ok(l.includes(`URL:${url}`));
  });

  it('gives an event with no end two hours', () => {
    const l = lines(eventIcs({ ...event, ends_at: null }, url, NOW));
    assert.ok(l.includes('DTEND:20261029T180000Z'));
  });

  it('escapes commas, semicolons and backslashes in text', () => {
    const l = lines(eventIcs({ ...event, title: 'A, B; C\\D' }, url, NOW));
    assert.ok(l.includes('SUMMARY:A\\, B\\; C\\\\D'));
    assert.ok(l.includes('LOCATION:Microlab Eindhoven\\, Strijp-S\\, Eindhoven'));
  });

  it('cannot be given extra properties through a line break in the title', () => {
    const ics = eventIcs({ ...event, title: 'Talk\r\nATTENDEE:mailto:x@example.com' }, url, NOW);
    assert.ok(!lines(ics).some((line) => line.startsWith('ATTENDEE')));
  });

  it('folds lines longer than 75 octets', () => {
    const ics = eventIcs({ ...event, title: 'Grow your network '.repeat(8) }, url, NOW);
    for (const line of lines(ics)) assert.ok(new TextEncoder().encode(line).length <= 75, line);
    assert.ok(ics.includes('\r\n '));
  });

  it('uses the city when there is no address', () => {
    const l = lines(eventIcs({ ...event, venue_address: null }, url, NOW));
    assert.ok(l.includes('LOCATION:Microlab Eindhoven\\, Eindhoven'));
  });
});

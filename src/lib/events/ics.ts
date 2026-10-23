// One event as an .ics file, for "Add to calendar" in the ticket email (Apple Calendar
// and anything else that opens .ics). RFC 5545: CRLF line ends, text escaped, lines folded
// at 75 octets. Times are UTC, so no VTIMEZONE block is needed.

export interface IcsEvent {
  id: string;
  title: string;
  summary: string | null;
  starts_at: string;
  ends_at: string | null;
  venue_name: string | null;
  venue_address: string | null;
  city: string | null;
}

/** An event with no end is put in the calendar for two hours. */
const DEFAULT_LENGTH_MS = 2 * 60 * 60 * 1000;

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// A line break in a title would otherwise start a property of its own.
function text(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n|\r/g, '\\n');
}

function fold(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = '';
  for (const char of line) {
    // A continuation line starts with a space, which counts toward its 75.
    const limit = out.length === 0 ? 75 : 74;
    if (encoder.encode(current + char).length > limit) {
      out.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  out.push(current);
  return out.join('\r\n ');
}

export function eventIcs(event: IcsEvent, url: string, now: Date = new Date()): string {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + DEFAULT_LENGTH_MS);
  const location = [event.venue_name, event.venue_address || event.city].filter(Boolean).join(', ');
  const description = [event.summary, url].filter(Boolean).join('\n\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Buzbo//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@buzbo.com`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${text(event.title)}`,
    ...(location ? [`LOCATION:${text(location)}`] : []),
    `DESCRIPTION:${text(description)}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .map(fold)
    .join('\r\n')
    .concat('\r\n');
}

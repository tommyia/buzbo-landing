import { getPublicSupabase, isSupabaseConfigured } from '../supabase';
import type { EventDetail, EventSummary } from './types';

const EVENTS_TABLE = 'buzbo_events';

const SUMMARY_COLUMNS =
  'id, title, slug, summary, cover_image_url, starts_at, ends_at, timezone, venue_name, city, host_name, ticket_types:buzbo_event_ticket_types(price_cents, currency)';

const DETAIL_COLUMNS =
  'id, title, slug, summary, description_html, cover_image_url, starts_at, ends_at, timezone, venue_name, venue_address, city, map_url, host_name, seo_title, seo_description, updated_at, ticket_types:buzbo_event_ticket_types(id, name, description, price_cents, currency, max_buddies, position)';

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

/** The ticket types of this event that cannot be bought any more. Empty on any failure:
 *  a visitor who is wrongly offered a sold-out ticket is told so by checkout, which is
 *  what actually decides. */
export async function getSoldOut(eventId: string): Promise<Set<string>> {
  if (!isSupabaseConfigured()) return new Set();

  const { data, error } = await getPublicSupabase().rpc('buzbo_event_availability', {
    p_event_id: eventId,
  });
  if (error) {
    console.error('events: could not read availability', eventId, error);
    return new Set();
  }
  const rows = (data ?? []) as Array<{ ticket_type_id: string; sold_out: boolean }>;
  return new Set(rows.filter((row) => row.sold_out).map((row) => row.ticket_type_id));
}

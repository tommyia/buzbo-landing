// Rows of buzbo_events and buzbo_event_ticket_types, as the publishable key sees them:
// published events only. They are authored in buzbo-event (Landing Page → Events).

/** The country whose events buzbo.com lists. GB events are listed on london.buzbo.com;
 *  their detail pages and checkout still live here. */
export const SITE_EVENT_COUNTRY = 'NL';

export interface TicketPrice {
  /** Integer cents. 0 is a free ticket. */
  price_cents: number;
  currency: string;
}

export interface TicketType extends TicketPrice {
  id: string;
  name: string;
  description: string | null;
  /** How many buddies one ticket may bring at the same price. 0 is off. */
  max_buddies: number;
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
  /** 'NL' or 'GB'. GB events are listed on london.buzbo.com. */
  country: string;
  description_html: string | null;
  venue_address: string | null;
  map_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  updated_at: string;
  ticket_types: TicketType[];
}

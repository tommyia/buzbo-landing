// The events list's country filter, and which events get the London look. Pure.
//
// The list defaults to NL; ?country=uk shows the GB events. A GB event's detail and
// order pages wear london.buzbo.com's header and footer, so somebody who came from the
// London site finds their way back to it.

export type ListCountry = 'NL' | 'GB';
export type ListPeriod = 'upcoming' | 'past';

/** The country the list shows for its ?country= value: GB for 'uk' or 'gb', NL for anything else. */
export function listCountry(param: string | null): ListCountry {
	const value = (param ?? '').trim().toLowerCase();
	return value === 'uk' || value === 'gb' ? 'GB' : 'NL';
}

/** A link to the list with both filters; the defaults (NL, upcoming) stay out of the address. */
export function eventsListHref(base: string, country: ListCountry, period: ListPeriod): string {
	const params = new URLSearchParams();
	if (country === 'GB') params.set('country', 'uk');
	if (period === 'past') params.set('period', 'past');
	const query = params.toString();
	return query ? `${base}?${query}` : base;
}

/**
 * True for an event in the UK. The country decides; the order page, whose answer from
 * buzbo-be carries no country, goes by the time zone instead (the same rule the country
 * backfill used).
 */
export function isLondonEvent(event: { country?: string | null; timezone?: string | null }): boolean {
	if (event.country) return event.country === 'GB';
	return event.timezone === 'Europe/London';
}

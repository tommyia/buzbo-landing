import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { purchaseHandoff } from './purchase.ts';
import type { OrderView } from './order.ts';

const ORDER: OrderView = {
	status: 'paid',
	buyer_name: 'Anna',
	event: { title: 'Buzbo x Juntos', slug: 'juntos', starts_at: '2026-11-26T17:00:00Z', ends_at: null, timezone: 'Europe/London', venue_name: null, venue_address: null, city: 'London' },
	ticket: { code: 'abc', status: 'valid', type_name: 'General admission' },
	purchase: { id: 'order-1', value: 12.5, currency: 'GBP', num_items: 2 },
};
const TICKET_PAGE = 'https://buzbo.com/events/orders/Zm9vYmFy';

describe('purchaseHandoff', () => {
	it('gives the Purchase figures, a clean address to show Meta, and the next stop', () => {
		const handoff = purchaseHandoff(ORDER, TICKET_PAGE, '/events/juntos');
		assert.deepEqual(handoff, {
			params: { value: 12.5, currency: 'GBP', num_items: 2, content_ids: ['juntos'], content_name: 'Buzbo x Juntos', content_type: 'product' },
			eventId: 'order-1',
			cleanPath: '/events/juntos',
			next: TICKET_PAGE,
		});
	});

	it('a free ticket is a Purchase worth 0', () => {
		assert.equal(purchaseHandoff({ ...ORDER, purchase: { ...ORDER.purchase!, value: 0 } }, TICKET_PAGE, '/events/juntos')?.params.value, 0);
	});

	it('goes on to the questionnaire when there is one, with the way back to the ticket', () => {
		const next = purchaseHandoff({ ...ORDER, questionnaire_url: 'https://form.buzbo.com/juntos' }, TICKET_PAGE, '/events/juntos')?.next;
		assert.equal(next, `https://form.buzbo.com/juntos#later=${encodeURIComponent(TICKET_PAGE)}`);
	});

	it('nothing for an order that is not a paid, valid ticket, or has no readable purchase', () => {
		assert.equal(purchaseHandoff({ ...ORDER, status: 'pending' }, TICKET_PAGE, '/events/juntos'), null);
		assert.equal(purchaseHandoff({ ...ORDER, ticket: { ...ORDER.ticket!, status: 'void' } }, TICKET_PAGE, '/events/juntos'), null);
		assert.equal(purchaseHandoff({ ...ORDER, purchase: undefined }, TICKET_PAGE, '/events/juntos'), null);
		assert.equal(purchaseHandoff({ ...ORDER, purchase: { ...ORDER.purchase!, currency: 'eur<script>' } }, TICKET_PAGE, '/events/juntos'), null);
		assert.equal(purchaseHandoff({ ...ORDER, purchase: { ...ORDER.purchase!, value: -1 } }, TICKET_PAGE, '/events/juntos'), null);
	});

	it('never shows Meta an address that holds the ticket', () => {
		assert.equal(purchaseHandoff(ORDER, TICKET_PAGE, '/events/orders/Zm9vYmFy'), null);
		assert.equal(purchaseHandoff(ORDER, TICKET_PAGE, 'https://evil.example/x'), null);
	});
});

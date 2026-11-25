// The Meta Purchase event, fired once on buzbo.com right after checkout. The order
// page's address IS the ticket, so before the pixel loads the page swaps its address
// for the event page's (cleanPath): Meta only ever sees that. Pure, for the tests.

import { questionnaireLink, withLaterLink, type OrderView } from './order.ts';

export interface PurchaseHandoff {
	params: {
		value: number;
		currency: string;
		num_items: number;
		content_ids: string[];
		content_name: string;
		content_type: 'product';
	};
	/** Meta's eventID: the order id, so a repeat counts once. */
	eventId: string;
	/** What the address bar shows while the pixel sends: the event page, never the ticket. */
	cleanPath: string;
	/** Where the buyer goes next: the questionnaire, else their ticket. */
	next: string;
}

const CURRENCY = /^[A-Z]{3}$/;
// An events path on this site, and nothing that holds an order's token.
const SAFE_PATH = /^\/[A-Za-z0-9/_-]*$/;

export function purchaseHandoff(order: OrderView, ticketPage: string, cleanPath: string): PurchaseHandoff | null {
	const purchase = order.purchase;
	if (order.status !== 'paid' || order.ticket?.status !== 'valid' || !purchase) return null;
	if (typeof purchase.id !== 'string' || !purchase.id) return null;
	if (!Number.isFinite(purchase.value) || purchase.value < 0 || !CURRENCY.test(purchase.currency)) return null;
	if (!SAFE_PATH.test(cleanPath) || cleanPath.includes('/orders/')) return null;

	const questionnaire = questionnaireLink(order);
	return {
		params: {
			value: purchase.value,
			currency: purchase.currency,
			num_items: Number.isInteger(purchase.num_items) && purchase.num_items > 0 ? purchase.num_items : 1,
			content_ids: [order.event.slug],
			content_name: order.event.title,
			content_type: 'product',
		},
		eventId: purchase.id,
		cleanPath,
		next: questionnaire ? withLaterLink(questionnaire, ticketPage) : ticketPage,
	};
}

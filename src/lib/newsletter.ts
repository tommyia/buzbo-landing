// The newsletter form in the site footer. buzbo-be's POST /api/email/subscribe
// adds the address and sends the welcome email; this file only decides where the
// form posts and what it says afterwards. Pure, so it is tested without a browser.

/** Where the form posts, from buzbo-be's address (checkoutApiUrl). Null hides the form. */
export function subscribeEndpoint(api: string | null): string | null {
	return api ? `${api}/api/email/subscribe` : null;
}

/** What the form says for buzbo-be's answer; 0 is a request that never got one. */
export function subscribeResult(status: number): { ok: boolean; message: string } {
	if (status >= 200 && status < 300) return { ok: true, message: 'Thanks for subscribing! Check your inbox for a welcome email.' };
	if (status === 400) return { ok: false, message: 'Enter a valid email address.' };
	if (status === 429) return { ok: false, message: 'Too many tries. Wait a few minutes and try again.' };
	return { ok: false, message: 'Something went wrong. Please try again.' };
}

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
	if (status === 403) return { ok: false, message: 'We could not confirm you are human. Please try again.' };
	if (status === 429) return { ok: false, message: 'Too many tries. Wait a few minutes and try again.' };
	return { ok: false, message: 'Something went wrong. Please try again.' };
}

export const NAME_MAX = 100;
const EMAIL_MAX = 320;
// Same characters as buzbo-be's normalizeEmail (src/services/email-contacts.js), which has the last word.
const EMAIL = /^[^\s@<>",;()[\]\\\x00-\x1f\x7f]+@[^\s@<>",;()[\]\\\x00-\x1f\x7f]+\.[^\s@<>",;()[\]\\\x00-\x1f\x7f]+$/;

/** What is wrong with a sign-up before it is sent, or null when it can go. */
export function checkSignup(name: string, email: string): string | null {
	const cleanName = name.trim();
	if (!cleanName) return 'Please enter your name.';
	if (cleanName.length > NAME_MAX) return `Please keep your name under ${NAME_MAX} characters.`;
	const cleanEmail = email.trim();
	if (cleanEmail.length > EMAIL_MAX || !EMAIL.test(cleanEmail)) return 'Enter a valid email address.';
	return null;
}

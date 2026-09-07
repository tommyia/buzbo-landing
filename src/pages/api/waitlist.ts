import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// This route runs on-demand (server-side) so the Brevo API key is never exposed.
export const prerender = false;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});
}

// On Cloudflare, secrets come from the Workers env; import.meta.env covers local dev via .env
function readEnv(key: string): string | undefined {
	return (env as Record<string, string | undefined>)?.[key] ?? import.meta.env[key];
}

export const POST: APIRoute = async ({ request }) => {
	let name = '';
	let email = '';

	try {
		const contentType = request.headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			const body = (await request.json()) as { name?: unknown; email?: unknown };
			name = String(body?.name ?? '').trim();
			email = String(body?.email ?? '').trim();
		} else {
			const form = await request.formData();
			name = String(form.get('name') ?? '').trim();
			email = String(form.get('email') ?? '').trim();
		}
	} catch {
		return json({ status: 'error', message: 'Invalid request.' }, 400);
	}

	if (!name) {
		return json({ status: 'error', message: 'Please enter your name.' }, 400);
	}

	if (!EMAIL_RE.test(email)) {
		return json({ status: 'error', message: 'Please enter a valid email address.' }, 400);
	}

	const apiKey = readEnv('BREVO_API_KEY');
	const listId = readEnv('BREVO_LIST_ID');

	if (!apiKey || !listId) {
		return json(
			{ status: 'error', message: 'The waitlist is temporarily unavailable. Please try again later.' },
			500,
		);
	}

	try {
		// 1. Does this contact already exist in Brevo?
		const existing = await fetch(`https://api.brevo.com/v3/contacts/${encodeURIComponent(email)}`, {
			headers: { 'api-key': apiKey, accept: 'application/json' },
		});

		if (existing.ok) {
			return json({ status: 'exists', message: 'This email is already registered.' });
		}
		if (existing.status !== 404) {
			return json({ status: 'error', message: 'Something went wrong. Please try again.' }, 502);
		}

		// 2. Create the contact and add them to the waitlist.
		const create = await fetch('https://api.brevo.com/v3/contacts', {
			method: 'POST',
			headers: {
				'api-key': apiKey,
				accept: 'application/json',
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				email,
				attributes: name ? { FIRSTNAME: name } : undefined,
				listIds: [Number(listId)],
				updateEnabled: false,
			}),
		});

		if (create.ok) {
			return json({ status: 'success', message: "You're on the waitlist — see you at launch!" });
		}

		// Race safety: Brevo flags an already-known contact as a duplicate.
		const errBody = (await create.json().catch(() => ({}))) as { code?: string };
		if (errBody?.code === 'duplicate_parameter') {
			return json({ status: 'exists', message: 'This email is already registered.' });
		}

		return json({ status: 'error', message: 'Something went wrong. Please try again.' }, 502);
	} catch {
		return json({ status: 'error', message: 'Something went wrong. Please try again.' }, 502);
	}
};

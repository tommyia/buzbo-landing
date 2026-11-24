import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkSignup, subscribeEndpoint, subscribeResult } from './newsletter.ts';

test('the endpoint is buzbo-be’s subscribe route', () => {
	assert.equal(subscribeEndpoint('https://api.buzbo.com'), 'https://api.buzbo.com/api/email/subscribe');
});

test('no buzbo-be address means no form', () => {
	assert.equal(subscribeEndpoint(null), null);
});

test('a sign-up says to look for the welcome email', () => {
	assert.deepEqual(subscribeResult(200), { ok: true, message: 'Thanks for subscribing! Check your inbox for a welcome email.' });
});

test('a refused address asks for a valid one', () => {
	assert.deepEqual(subscribeResult(400), { ok: false, message: 'Enter a valid email address.' });
});

test('too many tries asks to wait', () => {
	assert.deepEqual(subscribeResult(429), { ok: false, message: 'Too many tries. Wait a few minutes and try again.' });
});

test('anything else is a plain failure', () => {
	assert.deepEqual(subscribeResult(503), { ok: false, message: 'Something went wrong. Please try again.' });
	assert.deepEqual(subscribeResult(0), { ok: false, message: 'Something went wrong. Please try again.' });
});

test('a failed human check asks to try again', () => {
	assert.deepEqual(subscribeResult(403), { ok: false, message: 'We could not confirm you are human. Please try again.' });
});

test('a sign-up needs a name and an email address that looks like one', () => {
	assert.equal(checkSignup('Anna', 'anna@example.com'), null);
	assert.equal(checkSignup('  ', 'anna@example.com'), 'Please enter your name.');
	assert.equal(checkSignup('x'.repeat(101), 'anna@example.com'), 'Please keep your name under 100 characters.');
	for (const email of ['', 'anna', 'anna@', 'anna@example', '@example.com', 'an na@example.com', 'anna@exa mple.com']) {
		assert.equal(checkSignup('Anna', email), 'Enter a valid email address.', email);
	}
	assert.equal(checkSignup('Anna', `${'a'.repeat(310)}@example.com`), 'Enter a valid email address.');
});

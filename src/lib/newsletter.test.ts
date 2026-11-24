import assert from 'node:assert/strict';
import { test } from 'node:test';
import { subscribeEndpoint, subscribeResult } from './newsletter.ts';

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

import { env } from 'cloudflare:workers';

export function readEnv(key: string): string | undefined {
	return (env as Record<string, string | undefined>)?.[key] ?? import.meta.env[key];
}

export function requireEnv(key: string): string {
	const value = readEnv(key);
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}

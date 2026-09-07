import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readEnv, requireEnv } from './env';

export type ArticleStatus = 'draft' | 'published';

export type Article = {
	id: string;
	title: string;
	slug: string;
	excerpt: string | null;
	cover_image_url: string | null;
	content_json: Record<string, unknown> | null;
	content_html: string | null;
	status: ArticleStatus;
	/** Byline. Authored in buzbo-event; see migration 002. */
	author_name: string | null;
	reading_duration_minutes: number | null;
	published_at: string | null;
	seo_title: string | null;
	seo_description: string | null;
	created_at: string;
	updated_at: string;
};

let publicClient: SupabaseClient | null = null;

/** Read-only, RLS-enforced. Articles are written by buzbo-event, never by this app, so a
 *  service-role client is deliberately absent here. */
export function getPublicSupabase(): SupabaseClient {
	if (!publicClient) {
		publicClient = createClient(
			requireEnv('PUBLIC_SUPABASE_URL'),
			requireEnv('PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
		);
	}
	return publicClient;
}

export function isSupabaseConfigured(): boolean {
	// Only the public pair is needed now — requiring the service-role key here would make
	// /blog silently render "no articles" once that secret is removed.
	return Boolean(
		readEnv('PUBLIC_SUPABASE_URL') && readEnv('PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
	);
}

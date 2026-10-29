-- Ready for review.
--
-- The Buzbo connector for Claude (buzbo-event, /mcp) lets the marketing team draft articles
-- from a Claude chat and mark a draft ready for review. Status stays 'draft': these columns
-- only say who asked for a review, when, and why, so the public policy and the publish path
-- do not change. Publishing in the admin clears them.
--
-- Additive and safe to run once. Run manually in the Supabase SQL editor.

alter table public.buzbo_landing_article
  add column if not exists ready_for_review_at timestamptz,
  add column if not exists ready_for_review_by text,
  add column if not exists review_note text;

alter table public.buzbo_landing_article
  drop constraint if exists buzbo_landing_article_review_note_length;

alter table public.buzbo_landing_article
  add constraint buzbo_landing_article_review_note_length
  check (review_note is null or char_length(review_note) <= 1000);

create index if not exists buzbo_landing_article_ready_for_review_idx
  on public.buzbo_landing_article (ready_for_review_at desc)
  where ready_for_review_at is not null;

notify pgrst, 'reload schema';

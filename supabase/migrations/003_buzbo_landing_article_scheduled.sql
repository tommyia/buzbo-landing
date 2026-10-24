-- Scheduled articles.
--
-- buzbo-event lets an editor give a published article a publish date in the future. Until
-- that moment the article must stay off /blog, the article page and the sitemap. The public
-- policy now also requires published_at to have passed, so the article appears on its own
-- when the time comes: no job flips anything.
--
-- Every published row already has a published_at (first publish stamps it), so no live
-- article disappears. buzbo-event reads with the service role and still sees every row.
-- Run manually in the Supabase SQL editor or via `supabase db push`.

drop policy if exists "Public read published articles" on public.buzbo_landing_article;

create policy "Public read published articles"
  on public.buzbo_landing_article
  for select
  to anon, authenticated
  using (status = 'published' and published_at <= now());

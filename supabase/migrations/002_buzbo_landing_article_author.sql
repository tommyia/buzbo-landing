-- Adds the article byline.
--
-- Articles are authored in buzbo-event (Landing Page → Articles) and published here at
-- /blog/[slug]. The original table had no author field, so the byline could not render.
--
-- Additive and nullable: existing rows and the live /blog pages keep working unchanged.
-- Run manually in the Supabase SQL editor or via `supabase db push`.

alter table public.buzbo_landing_article
  add column if not exists author_name text;

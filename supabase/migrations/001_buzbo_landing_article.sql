-- Buzbo landing blog articles
-- Run manually in Supabase SQL editor or via supabase db push

create table if not exists public.buzbo_landing_article (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  cover_image_url text,
  content_json jsonb,
  content_html text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  reading_duration_minutes integer,
  published_at timestamptz,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buzbo_landing_article_status_idx
  on public.buzbo_landing_article (status);

create index if not exists buzbo_landing_article_published_at_idx
  on public.buzbo_landing_article (published_at desc nulls last);

create index if not exists buzbo_landing_article_slug_idx
  on public.buzbo_landing_article (slug);

create or replace function public.set_buzbo_landing_article_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists buzbo_landing_article_updated_at on public.buzbo_landing_article;

create trigger buzbo_landing_article_updated_at
  before update on public.buzbo_landing_article
  for each row
  execute function public.set_buzbo_landing_article_updated_at();

alter table public.buzbo_landing_article enable row level security;

drop policy if exists "Public read published articles" on public.buzbo_landing_article;

create policy "Public read published articles"
  on public.buzbo_landing_article
  for select
  to anon, authenticated
  using (status = 'published');

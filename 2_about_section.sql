-- ============================================================
-- Keerthi Gem & Jewellery — About section (run this AFTER schema.sql)
-- Run this ONCE in your Supabase project's SQL Editor, same as before:
-- Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
-- Safe to run even if you're not sure whether you've run it already —
-- it won't duplicate anything or break existing data.
-- ============================================================

-- A single row holding the About text + establishment year.
create table if not exists about_content (
  id integer primary key default 1 check (id = 1),
  heading text not null default 'Our Story',
  body text not null default '',
  established_year integer,
  updated_at timestamptz not null default now()
);

insert into about_content (id, heading, body, established_year) values (
  1,
  'Our Story',
  'Keerthi Gem & Jewellery has been serving the community with fine gems and handcrafted jewellery since 1990. Every piece is chosen and made with care, built to be kept and passed down for generations.',
  1990
)
on conflict (id) do nothing;

-- Photos shown in the About gallery.
create table if not exists about_photos (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table about_content enable row level security;
alter table about_photos enable row level security;

-- Everyone can read the About content and photos.
create policy "public read about_content" on about_content for select using (true);
create policy "public read about_photos" on about_photos for select using (true);

-- Only the admin (is_admin(), already defined in schema.sql) can edit them.
create policy "admin manage about_content" on about_content for all using (is_admin()) with check (is_admin());
create policy "admin manage about_photos" on about_photos for all using (is_admin()) with check (is_admin());

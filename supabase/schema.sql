-- ============================================================
-- Keerthi Gem & Jewellery — Supabase database setup
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste this whole file -> Run).
-- ============================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------

create table if not exists banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists weekly_hours (
  day_key text primary key check (day_key in ('mon','tue','wed','thu','fri','sat','sun')),
  is_open boolean not null default true,
  time_range text not null default ''
);

create table if not exists closed_dates (
  id uuid primary key default gen_random_uuid(),
  closed_date date not null,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Uncategorised',
  price text not null,
  image_url text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  purpose text not null,
  preferred_date date not null,
  notes text,
  status text not null default 'new' check (status in ('new','confirmed','done','cancelled')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- ADMIN CHECK
-- Edit the email below to the ONE staff login you'll create in
-- Authentication -> Users. Only a signed-in user with this exact
-- email can add/edit/delete anything. Everyone else (including
-- anyone who somehow signs up on their own) gets read-only or
-- appointment-booking access only, enforced by the database itself.
-- ---------------------------------------------------------------

create or replace function is_admin()
returns boolean
language sql
stable
as $$
  select auth.jwt() ->> 'email' = 'omalakshi78@gmail.com'; -- TODO: replace with your real admin email
$$;

-- ---------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------

alter table banners enable row level security;
alter table weekly_hours enable row level security;
alter table closed_dates enable row level security;
alter table products enable row level security;
alter table appointments enable row level security;

-- Everyone (including visitors who aren't logged in) can read the
-- content that's meant to show up on the public site.
create policy "public read banners" on banners for select using (true);
create policy "public read weekly_hours" on weekly_hours for select using (true);
create policy "public read closed_dates" on closed_dates for select using (true);
create policy "public read products" on products for select using (true);

-- Visitors can submit an appointment request, but cannot read, edit,
-- or delete anyone's appointments (including their own, once sent).
create policy "public insert appointments" on appointments for insert with check (true);

-- Only the admin (see is_admin() above) can create/edit/delete anything.
create policy "admin manage banners" on banners for all using (is_admin()) with check (is_admin());
create policy "admin manage weekly_hours" on weekly_hours for all using (is_admin()) with check (is_admin());
create policy "admin manage closed_dates" on closed_dates for all using (is_admin()) with check (is_admin());
create policy "admin manage products" on products for all using (is_admin()) with check (is_admin());
create policy "admin manage appointments" on appointments for all using (is_admin()) with check (is_admin());

-- ---------------------------------------------------------------
-- SEED DATA — starting content so the site isn't empty.
-- Safe to edit/delete afterwards from the admin dashboard.
-- ---------------------------------------------------------------

insert into weekly_hours (day_key, is_open, time_range) values
  ('mon', true,  '9.00 AM – 6.00 PM'),
  ('tue', true,  '9.00 AM – 6.00 PM'),
  ('wed', true,  '9.00 AM – 6.00 PM'),
  ('thu', true,  '9.00 AM – 6.00 PM'),
  ('fri', true,  '9.00 AM – 6.00 PM'),
  ('sat', true,  '9.00 AM – 5.00 PM'),
  ('sun', false, '')
on conflict (day_key) do nothing;

insert into banners (image_url, caption, sort_order) values
  ('https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1800&q=80', 'Timeless gold, cut to catch the light', 1),
  ('https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1800&q=80', 'Gemstones sourced with care', 2),
  ('https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1800&q=80', 'Heirlooms, handcrafted for you', 3);

insert into products (name, category, price, image_url, description) values
  ('Kandyan Gold Necklace', 'Necklaces', 'Rs. 185,000', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=80', '22K gold, traditional filigree work.'),
  ('Blue Sapphire Ring', 'Rings', 'Rs. 96,500', 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80', 'Ceylon blue sapphire, 18K white gold band.'),
  ('Pearl Drop Earrings', 'Earrings', 'Rs. 42,000', 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80', 'Freshwater pearls on gold hooks.'),
  ('Emerald Tennis Bracelet', 'Bracelets', 'Rs. 138,000', 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=900&q=80', 'Round-cut emeralds, 18K gold setting.');

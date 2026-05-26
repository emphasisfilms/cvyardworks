-- =============================================================
-- CV Yard Works — Supabase Schema
--
-- This runs INSIDE the existing snowplowsales Supabase project.
-- CV Yard Works tables all use the `cvy_` prefix so they don't
-- collide with snowplowsales's tables (equipment, messages, etc).
--
-- Run this in the SQL Editor of the snowplowsales Supabase project.
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =============================================================

-- ---------- TABLES ----------

-- Key-value content store for editable site copy.
-- One row per section. `value` is JSONB so each section can have its own shape.
create table if not exists public.cvy_site_content (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- Seasonal services (replaces src/data/services.ts).
create table if not exists public.cvy_services (
  id            text primary key,           -- 'spring' | 'summer' | 'fall' | 'winter' (also used as anchor)
  season        text not null,
  title         text not null,
  description   text not null,
  icon          text not null,
  color         text not null,
  items         jsonb not null default '[]'::jsonb,  -- string[]
  photo_path    text,                                -- nullable; path inside the cvy-site-photos bucket
  sort_order    int  not null default 0,
  updated_at    timestamptz not null default now()
);

-- Contact / estimate / careers form submissions.
create table if not exists public.cvy_messages (
  id                uuid primary key default gen_random_uuid(),
  form_type         text not null check (form_type in ('estimate','careers','contact')),
  name              text not null,
  email             text not null,
  phone             text,
  address           text,         -- estimate only
  service           text,         -- estimate only
  position          text,         -- careers only
  message           text,
  application_data  jsonb,        -- careers only: full hire application
  is_read           boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists cvy_messages_created_at_idx on public.cvy_messages (created_at desc);
create index if not exists cvy_messages_unread_idx on public.cvy_messages (is_read) where is_read = false;

-- Shared updated_at trigger function (cvy-scoped to avoid clobbering anything in snowplowsales).
create or replace function public.cvy_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists cvy_site_content_updated_at on public.cvy_site_content;
create trigger cvy_site_content_updated_at
  before update on public.cvy_site_content
  for each row execute function public.cvy_set_updated_at();

drop trigger if exists cvy_services_updated_at on public.cvy_services;
create trigger cvy_services_updated_at
  before update on public.cvy_services
  for each row execute function public.cvy_set_updated_at();


-- ---------- RLS ----------
alter table public.cvy_site_content enable row level security;
alter table public.cvy_services     enable row level security;
alter table public.cvy_messages     enable row level security;

-- cvy_site_content: public read, auth write
drop policy if exists "cvy_site_content public read"  on public.cvy_site_content;
drop policy if exists "cvy_site_content auth write"   on public.cvy_site_content;
create policy "cvy_site_content public read"
  on public.cvy_site_content for select
  to anon, authenticated using (true);
create policy "cvy_site_content auth write"
  on public.cvy_site_content for all
  to authenticated using (true) with check (true);

-- cvy_services: public read, auth write
drop policy if exists "cvy_services public read"  on public.cvy_services;
drop policy if exists "cvy_services auth write"   on public.cvy_services;
create policy "cvy_services public read"
  on public.cvy_services for select
  to anon, authenticated using (true);
create policy "cvy_services auth write"
  on public.cvy_services for all
  to authenticated using (true) with check (true);

-- cvy_messages: anon can INSERT (forms), only auth can read / update / delete
drop policy if exists "cvy_messages anon insert"  on public.cvy_messages;
drop policy if exists "cvy_messages auth read"    on public.cvy_messages;
drop policy if exists "cvy_messages auth update"  on public.cvy_messages;
drop policy if exists "cvy_messages auth delete"  on public.cvy_messages;
create policy "cvy_messages anon insert"
  on public.cvy_messages for insert
  to anon, authenticated with check (true);
create policy "cvy_messages auth read"
  on public.cvy_messages for select
  to authenticated using (true);
create policy "cvy_messages auth update"
  on public.cvy_messages for update
  to authenticated using (true) with check (true);
create policy "cvy_messages auth delete"
  on public.cvy_messages for delete
  to authenticated using (true);


-- ---------- SEED DATA ----------
-- Mirrors the current hardcoded copy in the repo. Safe to re-run.

insert into public.cvy_services (id, season, title, description, icon, color, items, sort_order) values
  ('spring','Spring','Spring Services',
   'Get your property ready for the growing season with our comprehensive spring services.',
   '🌱','#6abf69',
   '["Lawn Installation (Sod, Hydro Seeding, Hand Seeding)","Landscaping & Design","Spring Cleanup","Mulching"]'::jsonb,
   1),
  ('summer','Summer','Summer Services',
   'Keep your lawn and landscape looking pristine all summer long.',
   '☀️','#d4a017',
   '["Mowing & Lawn Maintenance","Bush & Hedge Trimming","Fertilizing Programs","General Lawn Care"]'::jsonb,
   2),
  ('fall','Fall','Fall Services',
   'Prepare your property for winter with thorough fall maintenance.',
   '🍂','#c46b2e',
   '["Leaf Cleanup","Bed Maintenance","Perennial Cutting","Mulching for Winter Protection"]'::jsonb,
   3),
  ('winter','Winter','Winter Services',
   'Reliable snow removal to keep your property safe and accessible.',
   '❄️','#7bb8d9',
   '["Commercial Snow Removal","Residential Driveway Plowing","Roof Snow Removal","Sanding & Salting"]'::jsonb,
   4)
on conflict (id) do nothing;

insert into public.cvy_site_content (key, value) values
  ('hero', jsonb_build_object(
    'tagline','Walpole, NH — Connecticut Valley Region',
    'titleLine1','Connecticut Valley',
    'titleLine2','Yard Works',
    'subtitle','Yard Work: Solved',
    'backgroundPath', null
  )),
  ('home_about', jsonb_build_object(
    'heading','Yard Work',
    'headingAccent','Solved',
    'paragraphs', jsonb_build_array(
      'Connecticut Valley Yard Works is your full-service landscaping and property maintenance partner in Walpole, New Hampshire. We serve the greater Connecticut Valley region with professional, reliable services year-round.',
      'From spring cleanups and lawn installations to fall leaf removal and winter snow plowing, our experienced crew handles it all. We take pride in keeping your property looking its best, no matter the season.',
      'Locally owned and operated, we treat every property like our own. Whether you need regular maintenance or a complete landscape transformation, we''re here to help.'
    ),
    'imagePath', null
  )),
  ('home_services_intro', jsonb_build_object(
    'heading','Year-Round',
    'headingAccent','Services',
    'subtitle','Professional landscaping, lawn care, and snow removal services for every season.'
  )),
  ('home_cta', jsonb_build_object(
    'heading','Ready to Transform',
    'headingAccent','Your Property?',
    'subtitle','Get a free, no-obligation estimate for any of our services. We''re here to help with all your yard work needs.'
  )),
  ('contact_page', jsonb_build_object(
    'heading','Contact',
    'headingAccent','Us',
    'subtitle','We''d love to hear from you. Reach out with any questions about our services.',
    'phoneNote','Call or text anytime',
    'locationNote','Serving the Connecticut Valley Region',
    'hoursValue','Mon – Sat',
    'hoursNote','7:00 AM – 6:00 PM',
    'ctaHeading','Need an',
    'ctaHeadingAccent','Estimate?',
    'ctaBody','For project quotes and service requests, head over to our estimate page. We''ll get back to you within 24 hours.'
  )),
  ('careers_page', jsonb_build_object(
    'heading','Join Our',
    'headingAccent','Team',
    'subtitle','We''re always looking for hardworking, reliable people to join our growing team.',
    'perks', jsonb_build_array(
      jsonb_build_object('title','Year-Round Work','body','Landscaping in warm months, snow removal in winter — steady work all year.'),
      jsonb_build_object('title','Outdoor Work','body','Spend your days outside working with your hands, not stuck behind a desk.'),
      jsonb_build_object('title','Growth Opportunities','body','Build your skills and grow with our company as we expand our services.'),
      jsonb_build_object('title','Local Team','body','Work close to home in the Connecticut Valley with a tight-knit crew.')
    ),
    'positions', jsonb_build_array(
      jsonb_build_object('title','Landscaping Crew Member','detail','Full-time · Seasonal / Year-round'),
      jsonb_build_object('title','Lawn Maintenance Technician','detail','Full-time · Seasonal'),
      jsonb_build_object('title','Snow Removal Operator','detail','Seasonal · On-call')
    )
  )),
  ('estimate_page', jsonb_build_object(
    'heading','Free',
    'headingAccent','Estimate',
    'subtitle','Tell us about your project and we''ll get back to you with a free, no-obligation estimate within 24 hours.',
    'benefits', jsonb_build_array(
      'Locally owned & operated',
      'Year-round services',
      'Free estimates',
      'Reliable & professional',
      'Residential & commercial'
    )
  )),
  ('site_settings', jsonb_build_object(
    'businessName','Connecticut Valley Yard Works',
    'shortName','CV Yard Works',
    'phone','(603) 499-6799',
    'phoneTel','6034996799',
    'location','Walpole, NH',
    'serviceArea','Connecticut Valley Region',
    'hoursLine','Mon – Sat · 7:00 AM – 6:00 PM',
    'social', jsonb_build_object('facebook', null, 'instagram', null)
  ))
on conflict (key) do nothing;

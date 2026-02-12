-- Generated print illustrations metadata
create table if not exists public.generated_illustrations (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  section_key text not null,
  style_preset text not null,
  prompt text not null,
  provider text not null,
  asset_url text not null,
  width integer not null,
  height integer not null,
  status text not null default 'generated',
  created_at timestamptz not null default now()
);

create index if not exists generated_illustrations_page_created_idx
  on public.generated_illustrations (page, created_at desc);

create index if not exists generated_illustrations_section_created_idx
  on public.generated_illustrations (section_key, created_at desc);

alter table public.generated_illustrations enable row level security;

-- Read-only policy for anon/authenticated clients
create policy if not exists "Generated illustrations are publicly readable"
  on public.generated_illustrations
  for select
  to anon, authenticated
  using (true);

-- Service role writes bypass RLS automatically

insert into storage.buckets (id, name, public)
values ('illustrations', 'illustrations', true)
on conflict (id) do update set public = excluded.public;

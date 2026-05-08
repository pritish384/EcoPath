-- Ecopath core schema

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.regions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.pathways (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.pathway_probabilities (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete cascade,
  region_id uuid references public.regions(id) on delete cascade,
  pathway_id uuid references public.pathways(id) on delete cascade,
  probability numeric(5,2) not null check (probability >= 0 and probability <= 100),
  confidence numeric(5,2),
  source text,
  updated_at timestamptz default now()
);

create table if not exists public.loss_hotspots (
  id uuid primary key default gen_random_uuid(),
  pathway_probability_id uuid references public.pathway_probabilities(id) on delete cascade,
  label text not null,
  description text,
  severity text,
  created_at timestamptz default now()
);

create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  product_id uuid references public.products(id),
  region_id uuid references public.regions(id),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.analysis_pathways (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references public.analyses(id) on delete cascade,
  pathway_id uuid references public.pathways(id),
  probability numeric(5,2) not null check (probability >= 0 and probability <= 100),
  loss_hotspot text,
  created_at timestamptz default now()
);

alter table public.products enable row level security;
alter table public.regions enable row level security;
alter table public.pathways enable row level security;
alter table public.pathway_probabilities enable row level security;
alter table public.loss_hotspots enable row level security;
alter table public.analyses enable row level security;
alter table public.analysis_pathways enable row level security;

-- Reference data is readable by anyone
create policy "public read products" on public.products
  for select using (true);
create policy "public read regions" on public.regions
  for select using (true);
create policy "public read pathways" on public.pathways
  for select using (true);
create policy "public read pathway probabilities" on public.pathway_probabilities
  for select using (true);
create policy "public read loss hotspots" on public.loss_hotspots
  for select using (true);

-- Allow authenticated users to manage reference data (for admin UI)
create policy "auth manage products" on public.products
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "auth manage regions" on public.regions
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "auth manage pathways" on public.pathways
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "auth manage pathway probabilities" on public.pathway_probabilities
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "auth manage loss hotspots" on public.loss_hotspots
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Analyses are user-owned
create policy "users manage analyses" on public.analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage analysis pathways" on public.analysis_pathways
  for all using (
    exists (
      select 1 from public.analyses
      where analyses.id = analysis_pathways.analysis_id
      and analyses.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.analyses
      where analyses.id = analysis_pathways.analysis_id
      and analyses.user_id = auth.uid()
    )
  );

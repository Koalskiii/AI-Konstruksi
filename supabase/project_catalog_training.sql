-- AIKON project, building, floor, catalog, and training-photo schema
-- Run this once in the Supabase SQL Editor for the active project.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists public.buildings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (project_id, name)
);

create table if not exists public.floors (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (building_id, name)
);

create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  building_id uuid references public.buildings(id) on delete set null,
  floor_id uuid references public.floors(id) on delete set null,
  name text not null,
  description text,
  quantity integer not null default 1 check (quantity >= 0),
  icon text not null default '▦',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalog_item_photos (
  id uuid primary key default gen_random_uuid(),
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  storage_path text not null,
  label text,
  created_at timestamptz not null default now()
);

create table if not exists public.training_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  storage_path text not null,
  label text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.projects (name, location)
select 'Sekolah Kemala Taruna Bhayangkara', 'Gunung Sindur, Bogor'
where not exists (
  select 1 from public.projects
  where name = 'Sekolah Kemala Taruna Bhayangkara'
);

insert into public.buildings (project_id, name)
select p.id, b.name
from public.projects p
cross join (values
  ('Library'), ('Swimming Pool'), ('Academic'), ('''Director''s Housing'),
  ('Faculty Housing'), ('Welcoming Center'), ('Gymnasium'), ('Art Center')
) as b(name)
where p.name = 'Sekolah Kemala Taruna Bhayangkara'
on conflict (project_id, name) do nothing;

alter table public.projects enable row level security;
alter table public.buildings enable row level security;
alter table public.floors enable row level security;
alter table public.catalog_items enable row level security;
alter table public.catalog_item_photos enable row level security;
alter table public.training_images enable row level security;

drop policy if exists projects_read_authenticated on public.projects;
create policy projects_read_authenticated on public.projects for select to authenticated using (true);
drop policy if exists buildings_read_authenticated on public.buildings;
create policy buildings_read_authenticated on public.buildings for select to authenticated using (true);
drop policy if exists floors_read_authenticated on public.floors;
create policy floors_read_authenticated on public.floors for select to authenticated using (true);
drop policy if exists catalog_read_authenticated on public.catalog_items;
create policy catalog_read_authenticated on public.catalog_items for select to authenticated using (true);
drop policy if exists catalog_photos_read_authenticated on public.catalog_item_photos;
create policy catalog_photos_read_authenticated on public.catalog_item_photos for select to authenticated using (true);
drop policy if exists training_read_authenticated on public.training_images;
create policy training_read_authenticated on public.training_images for select to authenticated using (true);

-- Admin-only mutations. This assumes profiles.id = auth.users.id and profiles.role = 'admin'.
drop policy if exists buildings_admin_write on public.buildings;
create policy buildings_admin_write on public.buildings for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists floors_admin_write on public.floors;
create policy floors_admin_write on public.floors for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists catalog_admin_write on public.catalog_items;
create policy catalog_admin_write on public.catalog_items for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists training_admin_write on public.training_images;
create policy training_admin_write on public.training_images for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

insert into storage.buckets (id, name, public)
values ('aikon-training', 'aikon-training', false)
on conflict (id) do nothing;

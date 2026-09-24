-- AIKON — Location Hierarchy: Room level + soft delete
-- Site (projects) -> Building (buildings) -> Floor (floors) -> Room (rooms, NEW) -> Item (catalog_items)

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  floor_id uuid not null references public.floors(id) on delete cascade,
  name text not null,
  room_type text,
  description text,
  status text not null default 'Aktif',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rooms_floor_name_active_uidx
  on public.rooms (floor_id, name)
  where (is_active);

create index if not exists rooms_floor_id_idx on public.rooms (floor_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rooms_touch_updated_at on public.rooms;
create trigger rooms_touch_updated_at
before update on public.rooms
for each row execute function public.touch_updated_at();

alter table public.projects add column if not exists is_active boolean not null default true;
alter table public.buildings add column if not exists is_active boolean not null default true;
alter table public.floors add column if not exists is_active boolean not null default true;
alter table public.catalog_items add column if not exists is_active boolean not null default true;

alter table public.catalog_items
  add column if not exists room_id uuid references public.rooms(id) on delete set null;

create index if not exists catalog_items_room_id_idx on public.catalog_items (room_id);

alter table public.rooms enable row level security;

drop policy if exists rooms_read_authenticated on public.rooms;
create policy rooms_read_authenticated
on public.rooms for select to authenticated
using (true);

drop policy if exists rooms_admin_write on public.rooms;
create policy rooms_admin_write
on public.rooms for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
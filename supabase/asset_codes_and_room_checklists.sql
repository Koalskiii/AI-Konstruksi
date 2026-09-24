alter table public.catalog_items add column if not exists item_code text;

create unique index if not exists catalog_items_item_code_unique
on public.catalog_items (item_code)
where item_code is not null and btrim(item_code) <> '';

create table if not exists public.room_asset_checklists (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  catalog_item_id uuid not null references public.catalog_items(id) on delete cascade,
  is_checked boolean not null default false,
  checked_by uuid references auth.users(id),
  checked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(room_id, catalog_item_id)
);

alter table public.room_asset_checklists enable row level security;

drop policy if exists room_asset_checklists_read_authenticated on public.room_asset_checklists;
create policy room_asset_checklists_read_authenticated
on public.room_asset_checklists for select to authenticated
using (true);

drop policy if exists room_asset_checklists_write_supervisor_admin on public.room_asset_checklists;
create policy room_asset_checklists_write_supervisor_admin
on public.room_asset_checklists for all to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and lower(coalesce(p.role,'')) in ('admin','supervisor')
))
with check (exists (
  select 1 from public.profiles p
  where p.id = auth.uid()
    and lower(coalesce(p.role,'')) in ('admin','supervisor')
));
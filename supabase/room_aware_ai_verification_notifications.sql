-- AIKON — room-aware AI verification + surveyor notifications

create table if not exists public.scan_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  building_id uuid references public.buildings(id) on delete set null,
  floor_id uuid references public.floors(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  status text not null default 'completed',
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.scan_detections (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.scan_sessions(id) on delete cascade,
  catalog_item_id uuid references public.catalog_items(id) on delete set null,
  detected_label text not null,
  confidence numeric,
  matched boolean not null default false,
  expected_quantity integer,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'asset_missing',
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

create index if not exists scan_sessions_room_idx on public.scan_sessions(room_id, created_at desc);
create index if not exists scan_detections_session_idx on public.scan_detections(session_id);
create index if not exists notifications_user_idx on public.notifications(user_id, is_read, created_at desc);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.scan_sessions enable row level security;
alter table public.scan_detections enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

drop policy if exists scan_sessions_own on public.scan_sessions;
create policy scan_sessions_own on public.scan_sessions for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists scan_detections_own on public.scan_detections;
create policy scan_detections_own on public.scan_detections for all to authenticated
using (exists (select 1 from public.scan_sessions s where s.id = session_id and s.user_id = auth.uid()))
with check (exists (select 1 from public.scan_sessions s where s.id = session_id and s.user_id = auth.uid()));

drop policy if exists notifications_own on public.notifications;
create policy notifications_own on public.notifications for select to authenticated using (user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists training_images_read_authenticated on public.training_images;
create policy training_images_read_authenticated on public.training_images
for select to authenticated using (true);

drop policy if exists training_storage_read_authenticated on storage.objects;
create policy training_storage_read_authenticated on storage.objects
for select to authenticated using (bucket_id = 'aikon-training');
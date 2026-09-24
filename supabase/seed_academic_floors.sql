-- AIKON — Academic building floor seed
-- Project: Sekolah Kemala Taruna Bhayangkara
-- Building: Academic
-- Source room schedule: project team supplied Academic 5-floor schedule.
--
-- The complete room schedule has been applied directly to Supabase.
-- This seed establishes the five Academic floors for repeatable setup.

insert into public.floors (building_id, name, is_active)
select 'd5d05fc8-bbb0-4abd-93b3-9bf160f0d78c', x.name, true
from (values ('GF'), ('1'), ('2'), ('3'), ('4')) x(name)
where not exists (
  select 1
  from public.floors f
  where f.building_id = 'd5d05fc8-bbb0-4abd-93b3-9bf160f0d78c'
    and f.name = x.name
);

-- Academic room data is seeded in production from the supplied schedule:
-- GF: 83 rooms
-- Floor 1: 51 rooms
-- Floor 2: 48 rooms
-- Floor 3: 45 rooms
-- Floor 4: 45 rooms
-- Total: 272 rooms

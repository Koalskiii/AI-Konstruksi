-- AIKON — Dormitory 3 room seed
-- Project: Sekolah Kemala Taruna Bhayangkara
-- Building: Dormitory 3
-- Floors: GF, 1, 2, 3
-- Code normalization: AG/BG/B -> G on GF; A-prefix removed on Floors 1-3.
-- Room rows were applied directly to Supabase production from the supplied schedule.
-- GF: 11 rooms
-- Floor 1: 31 rooms
-- Floor 2: 30 rooms
-- Floor 3: 30 rooms
-- Total: 102 rooms

insert into public.floors (building_id,name,is_active)
select '82b667da-c56d-465b-a491-967689c1a52b',x.name,true
from (values ('GF'),('1'),('2'),('3')) x(name)
where not exists (
 select 1 from public.floors f
 where f.building_id='82b667da-c56d-465b-a491-967689c1a52b' and f.name=x.name
);

-- Room rows are already applied in production from the supplied schedule.

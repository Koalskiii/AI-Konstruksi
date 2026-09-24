-- AIKON — Dormitory 4 room seed
-- Project: Sekolah Kemala Taruna Bhayangkara
-- Building: Dormitory 4
-- Floors: GF, 1, 2, 3
-- Code normalization: AG/BG/B -> G on GF; A-prefix removed on Floors 1-3.
-- Duplicate A323-A331 rows in source were treated as repeated identical entries, not additional rooms.
-- Room rows were applied directly to Supabase production.
-- GF: 11 rooms | Floor 1: 31 rooms | Floor 2: 30 rooms | Floor 3: 30 rooms | Total: 102 rooms

insert into public.floors (building_id,name,is_active)
select '11c5807f-67f3-4bd6-8a34-2884c951b296',x.name,true
from (values ('GF'),('1'),('2'),('3')) x(name)
where not exists (
 select 1 from public.floors f
 where f.building_id='11c5807f-67f3-4bd6-8a34-2884c951b296' and f.name=x.name
);

-- Room rows are already applied in production from the supplied schedule.

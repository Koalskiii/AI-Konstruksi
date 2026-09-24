-- AIKON — Dormitory 2 room seed
-- Project: Sekolah Kemala Taruna Bhayangkara
-- Building: Dormitory 2
-- Floors: GF, 1, 2, 3
-- Room schedule supplied by project team.
--
-- Applied directly to Supabase production from the supplied schedule.
-- Code normalization:
--   BG/B -> G on GF
--   A100.. -> 100.. on Floors 1-3

insert into public.floors (building_id,name,is_active)
select '2ec1adec-cc51-455b-805e-4cbdb4c251c4',x.name,true
from (values ('GF'),('1'),('2'),('3')) x(name)
where not exists (
  select 1 from public.floors f
  where f.building_id='2ec1adec-cc51-455b-805e-4cbdb4c251c4' and f.name=x.name
);

-- Room rows were applied directly to production from the supplied schedule.
-- GF: 19 rooms
-- Floor 1: 32 rooms
-- Floor 2: 30 rooms
-- Floor 3: 30 rooms
-- Total: 111 rooms

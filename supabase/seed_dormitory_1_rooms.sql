-- AIKON — Dormitory 1 room seed
-- Project: Sekolah Kemala Taruna Bhayangkara
-- Building: Dormitory 1
-- Floors: GF, 1, 2, 3
-- Room schedule supplied by project team.
-- Note: the source uses the code "G" repeatedly on GF. The DB enforces
-- unique room names per floor, so the second identical Outdoor Activities
-- Area is stored as "G — Outdoor Activities Area (2)" without inventing a
-- different room code.

insert into public.floors (building_id,name,is_active)
select '3f4b21c2-8288-41a5-beeb-7daabf55976d',x.name,true
from (values ('GF'),('1'),('2'),('3')) x(name)
where not exists (
 select 1 from public.floors f
 where f.building_id='3f4b21c2-8288-41a5-beeb-7daabf55976d' and f.name=x.name
);

-- Room rows have been applied directly to the production database from the supplied schedule.

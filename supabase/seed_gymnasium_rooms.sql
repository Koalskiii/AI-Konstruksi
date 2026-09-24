-- AIKON seed: Gymnasium room structure
-- Existing project: Sekolah Kemala Taruna Bhayangkara
-- Building: Gymnasium
-- GF = G00-G32; Floor 1 = 100-113

DO $$
DECLARE
  v_building uuid;
  v_floor_gf uuid;
  v_floor_1 uuid;
BEGIN
  SELECT id INTO v_building FROM public.buildings
  WHERE name='Gymnasium' LIMIT 1;

  SELECT id INTO v_floor_gf FROM public.floors
  WHERE building_id=v_building AND name='GF' LIMIT 1;
  IF v_floor_gf IS NULL THEN
    INSERT INTO public.floors(building_id,name,is_active)
    VALUES(v_building,'GF',true) RETURNING id INTO v_floor_gf;
  END IF;

  SELECT id INTO v_floor_1 FROM public.floors
  WHERE building_id=v_building AND name='1' LIMIT 1;
  IF v_floor_1 IS NULL THEN
    INSERT INTO public.floors(building_id,name,is_active)
    VALUES(v_building,'1',true) RETURNING id INTO v_floor_1;
  END IF;

  INSERT INTO public.rooms(floor_id,name,status,is_active)
  SELECT v_floor_gf, x.code || ' — ' || x.name, 'active', true
  FROM (VALUES
    ('G00','-'),('G01','Storage 2'),('G02','Chair Storage 2'),('G03','Chair Storage 1'),
    ('G04','Backstage WC'),('G05','Stage AV Equipment'),('G06','Storage 1'),('G07','Panel and Control Room'),
    ('G08','Marching Band Storage'),('G09','WC'),('G10','Men''s Locker Room'),('G11','Main Trainers'' Room'),
    ('G11.1','TR1'),('G11.2','TR2'),('G11.3','TR3'),('G12','WC'),('G13','Women''s Locker Room'),
    ('G14','Visiting Team 2'),('G15','Visiting Team 1'),('G16','Health Classroom 1'),('G17','PE Office'),
    ('G18','Accessible Toilet 1'),('G19','Accessible Toilet 2'),('G20','-'),('G21','-'),('G22','Men''s WC'),
    ('G23','Women''s WC'),('G24','WC'),('G25','WC'),('G26','Girls'' Locker Room 1'),('G27','Girls'' Locker Room 2'),
    ('G28','Athletic Equipment Storage'),('G29','Boys'' Locker Room 1'),('G30','Boys'' Locker Room 2'),
    ('G31','WC'),('G32','WC')
  ) x(code,name)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.floor_id=v_floor_gf AND r.name=x.code || ' — ' || x.name
  );

  INSERT INTO public.rooms(floor_id,name,status,is_active)
  SELECT v_floor_1, x.code || ' — ' || x.name, 'active', true
  FROM (VALUES
    ('100','Gym'),('100.1','Storage'),('100.2','Office'),('101','Dance / Aerobics Studio'),
    ('102','Storage'),('103','Wellness Studio'),('104','Storage'),('105','Men''s WC'),
    ('106','Women''s WC'),('107','-'),('108','-'),('109','Accessible Toilet 1'),
    ('110','Accessible Toilet 2'),('111','Martial Arts Studio'),('112','Roof Access'),
    ('113','Meeting Room')
  ) x(code,name)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.floor_id=v_floor_1 AND r.name=x.code || ' — ' || x.name
  );
END $$;
/* AIKON production-aligned role policies v3.
   Admin remains system administrator and approval authority.
   Owner + PM & Supervisor manage assigned project structure.
   QA/QC manages quality/training records.
   Field User does not receive management/training write access.
*/
drop policy if exists projects_admin_write on public.projects;
drop policy if exists projects_management_write on public.projects;
create policy projects_management_write on public.projects for all to authenticated
using ((select public.can_manage_project(id)))
with check ((select public.can_manage_project(id)));

drop policy if exists buildings_admin_write on public.buildings;
drop policy if exists buildings_management_write on public.buildings;
create policy buildings_management_write on public.buildings for all to authenticated
using ((select public.can_manage_project(project_id)))
with check ((select public.can_manage_project(project_id)));

drop policy if exists floors_admin_write on public.floors;
drop policy if exists floors_management_write on public.floors;
create policy floors_management_write on public.floors for all to authenticated
using (exists (select 1 from public.buildings b where b.id=floors.building_id and (select public.can_manage_project(b.project_id))))
with check (exists (select 1 from public.buildings b where b.id=floors.building_id and (select public.can_manage_project(b.project_id))));

drop policy if exists catalog_admin_write on public.catalog_items;
drop policy if exists catalog_management_write on public.catalog_items;
create policy catalog_management_write on public.catalog_items for all to authenticated
using ((select public.can_manage_project(project_id)))
with check ((select public.can_manage_project(project_id)));

drop policy if exists rooms_admin_write on public.rooms;
drop policy if exists rooms_management_write on public.rooms;
create policy rooms_management_write on public.rooms for all to authenticated
using (exists (select 1 from public.floors f join public.buildings b on b.id=f.building_id where f.id=rooms.floor_id and (select public.can_manage_project(b.project_id))))
with check (exists (select 1 from public.floors f join public.buildings b on b.id=f.building_id where f.id=rooms.floor_id and (select public.can_manage_project(b.project_id))));

drop policy if exists room_asset_checklists_write_supervisor_admin on public.room_asset_checklists;
drop policy if exists room_asset_checklists_write_management on public.room_asset_checklists;
create policy room_asset_checklists_write_management on public.room_asset_checklists for all to authenticated
using ((select public.is_quality_role()) and exists (
  select 1 from public.rooms r
  join public.floors f on f.id=r.floor_id
  join public.buildings b on b.id=f.building_id
  where r.id=room_asset_checklists.room_id
    and (select public.has_project_access(b.project_id))
))
with check ((select public.is_quality_role()) and exists (
  select 1 from public.rooms r
  join public.floors f on f.id=r.floor_id
  join public.buildings b on b.id=f.building_id
  where r.id=room_asset_checklists.room_id
    and (select public.has_project_access(b.project_id))
));

drop policy if exists training_storage_admin_insert on storage.objects;
drop policy if exists training_storage_management_insert on storage.objects;
drop policy if exists training_storage_insert_quality on storage.objects;
create policy training_storage_insert_quality on storage.objects for insert to authenticated
with check (bucket_id='aikon-training' and (select public.is_quality_role()));

drop policy if exists training_storage_admin_delete on storage.objects;
drop policy if exists training_storage_delete_admin on storage.objects;
create policy training_storage_delete_admin on storage.objects for delete to authenticated
using (bucket_id='aikon-training' and (select public.is_admin()));

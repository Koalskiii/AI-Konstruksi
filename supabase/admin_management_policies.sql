/* AIKON operational role policies v2.
   Admin remains system administrator.
   Owner + PM & Supervisor manage project structure.
   QA/QC manages quality records.
   Field User collects field data.
*/
drop policy if exists projects_admin_write on public.projects;
drop policy if exists projects_management_write on public.projects;
create policy projects_management_write on public.projects for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','owner','pm & supervisor')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','owner','pm & supervisor')));

drop policy if exists buildings_admin_write on public.buildings;
drop policy if exists buildings_management_write on public.buildings;
create policy buildings_management_write on public.buildings for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','owner','pm & supervisor')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','owner','pm & supervisor')));

drop policy if exists floors_admin_write on public.floors;
drop policy if exists floors_management_write on public.floors;
create policy floors_management_write on public.floors for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','owner','pm & supervisor')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','owner','pm & supervisor')));

drop policy if exists catalog_admin_write on public.catalog_items;
drop policy if exists catalog_management_write on public.catalog_items;
create policy catalog_management_write on public.catalog_items for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','owner','pm & supervisor')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','owner','pm & supervisor')));

drop policy if exists rooms_admin_write on public.rooms;
drop policy if exists rooms_management_write on public.rooms;
create policy rooms_management_write on public.rooms for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','owner','pm & supervisor')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','owner','pm & supervisor')));

drop policy if exists room_asset_checklists_write_supervisor_admin on public.room_asset_checklists;
drop policy if exists room_asset_checklists_write_management on public.room_asset_checklists;
create policy room_asset_checklists_write_management on public.room_asset_checklists for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','owner','pm & supervisor','qa/qc')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','owner','pm & supervisor','qa/qc')));

drop policy if exists training_storage_admin_insert on storage.objects;
drop policy if exists training_storage_management_insert on storage.objects;
create policy training_storage_management_insert on storage.objects for insert to authenticated
with check (bucket_id = 'aikon-training' and exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) in ('admin','qa/qc')));

drop policy if exists training_storage_admin_delete on storage.objects;
create policy training_storage_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'aikon-training' and lower((select p.role from public.profiles p where p.id = auth.uid())) = 'admin');

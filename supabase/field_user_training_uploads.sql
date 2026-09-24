-- AIKON — let regular (non-admin) users submit training photos

drop policy if exists training_images_insert_own on public.training_images;
create policy training_images_insert_own
on public.training_images for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists training_storage_insert_own on storage.objects;
create policy training_storage_insert_own
on storage.objects for insert to authenticated
with check (bucket_id = 'aikon-training');

drop policy if exists catalog_items_insert_unassigned on public.catalog_items;
create policy catalog_items_insert_unassigned
on public.catalog_items for insert to authenticated
with check (building_id is null and floor_id is null and room_id is null);
/* Admin-only write policies for project management. */
drop policy if exists projects_admin_write on public.projects;
create policy projects_admin_write on public.projects for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Storage policies for the private training bucket.
drop policy if exists training_storage_admin_insert on storage.objects;
create policy training_storage_admin_insert on storage.objects for insert to authenticated
with check (bucket_id = 'aikon-training' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists training_storage_admin_delete on storage.objects;
create policy training_storage_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'aikon-training' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

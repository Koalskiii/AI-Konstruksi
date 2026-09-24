-- AIKON account roles v2
-- Admin is preserved as the system authority.
-- Operational roles: Owner, PM & Supervisor, Field User, QA/QC.
-- IMPORTANT: approval remains authoritative; this migration must not overwrite
-- an approved Admin role during signup.

alter table public.profiles enable row level security;

-- Normalize legacy stored roles without changing the existing approved Admin account.
update public.profiles
set role = case
  when lower(coalesce(role,'')) in ('admin','administrator') then 'Admin'
  when lower(coalesce(role,'')) in ('owner','client','project owner') then 'Owner'
  when lower(coalesce(role,'')) in ('supervisor','project manager','pm','pm/supervisor','pm & supervisor','supervisor / pm') then 'PM & Supervisor'
  when lower(coalesce(role,'')) in ('qa/qc','qa qc','quality control','quality assurance') then 'QA/QC'
  when lower(coalesce(role,'')) in ('surveyor','field user','field_user','field-user') then 'Field User'
  else role
end
where role is not null;

do $$
begin
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles add constraint profiles_role_check
    check (role is null or role in ('Admin','Owner','PM & Supervisor','Field User','QA/QC'));
exception when undefined_table then
  raise exception 'Table public.profiles belum ada. Buat tabel profiles terlebih dahulu.';
end $$;

-- Do NOT force a role on INSERT.
-- public.handle_new_user() intentionally creates new profiles with role = NULL
-- and approval_status = pending. Admin approval assigns the final role.
drop trigger if exists profiles_force_default_role on public.profiles;
drop function if exists public.force_default_profile_role();

-- Existing approval policies remain authoritative.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
for select to authenticated
using ((select auth.uid()) = id);

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
for select to authenticated
using ((select public.is_admin()));

-- Admin is never self-assigned by signup metadata.
-- The registration workflow continues to use requested_role + pending approval.

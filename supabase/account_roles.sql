-- AIKON account roles v2
-- Admin is preserved. Operational roles: Owner, PM & Supervisor, Field User, QA/QC.
alter table public.profiles add column if not exists role text not null default 'Field User';

update public.profiles
set role = case
  when lower(coalesce(role,'')) in ('admin','administrator') then 'admin'
  when lower(coalesce(role,'')) in ('owner','client','project owner') then 'Owner'
  when lower(coalesce(role,'')) in ('supervisor','project manager','pm','pm/supervisor','pm & supervisor','supervisor / pm') then 'PM & Supervisor'
  when lower(coalesce(role,'')) in ('qa/qc','qa qc','quality control','quality assurance') then 'QA/QC'
  when lower(coalesce(role,'')) in ('surveyor','field user','field_user','field-user') then 'Field User'
  else 'Field User'
end;

do $$
begin
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles add constraint profiles_role_check
    check (role in ('admin','Owner','PM & Supervisor','Field User','QA/QC'));
exception when undefined_table then
  raise exception 'Table public.profiles belum ada. Buat tabel profiles terlebih dahulu.';
end $$;

create or replace function public.force_default_profile_role()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then new.role := 'Field User'; end if;
  return new;
end;
$$;
drop trigger if exists profiles_force_default_role on public.profiles;
create trigger profiles_force_default_role before insert on public.profiles
for each row execute function public.force_default_profile_role();

alter table public.profiles enable row level security;
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles for select to authenticated
using (exists (select 1 from public.profiles admin_profile where admin_profile.id = auth.uid() and lower(admin_profile.role) = 'admin'));

-- Public signup never self-assigns a privileged role. Admin approval remains authoritative.

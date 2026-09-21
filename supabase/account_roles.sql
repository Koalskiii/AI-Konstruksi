-- AIKON account roles setup
-- Run this script once in Supabase SQL Editor.
-- New registrations are always regular Field User accounts.
-- Promote an account to admin manually with the UPDATE statement at the end.

alter table public.profiles
  add column if not exists role text not null default 'Field User';

-- Normalize any older values before applying the constraint.
update public.profiles
set role = 'Field User'
where role is null
   or role not in ('admin', 'Field User', 'Supervisor', 'QA/QC', 'Project Manager');

do $$
begin
  alter table public.profiles
    drop constraint if exists profiles_role_check;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('admin', 'Field User', 'Supervisor', 'QA/QC', 'Project Manager'));
exception
  when undefined_table then
    raise exception 'Table public.profiles belum ada. Buat tabel profiles terlebih dahulu.';
end $$;

-- Never trust the role submitted by the public signup form.
create or replace function public.force_default_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.role := 'Field User';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_force_default_role on public.profiles;

create trigger profiles_force_default_role
before insert on public.profiles
for each row
execute function public.force_default_profile_role();

-- Each signed-in user can read their own profile, which is required by the app.
alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- Optional admin read access for a future account-management screen.
drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin
on public.profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles admin_profile
    where admin_profile.id = auth.uid()
      and admin_profile.role = 'admin'
  )
);

-- Promote the first administrator by replacing the email below.
-- This must be run manually after the account exists in Supabase Auth.
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'admin@example.com');

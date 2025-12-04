-- Combined migration for eport-web
-- Run this in Supabase Dashboard → SQL Editor

-- Use pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- Roles enum
do $$ begin
  create type user_role as enum ('admin','user');
exception when duplicate_object then null; end $$;

-- Departments
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- Profiles mapping auth.users -> role/department
create table if not exists public.profiles (create extension if not exists "pgcrypto";
  user_id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'user',
  department_id uuid references public.departments (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Assets
create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid not null references public.categories (id) on delete restrict,
  department_id uuid not null references public.departments (id) on delete restrict,
  date_purchased date not null,
  cost numeric(12,2) not null check (cost >= 0),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_assets_created_by on public.assets (created_by);
create index if not exists idx_assets_category on public.assets (category_id);
create index if not exists idx_assets_department on public.assets (department_id);

-- Helper: check if current user is admin
create or replace function public.is_admin() returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles where user_id = auth.uid() and role = 'admin'
  );
$$;

-- Enable RLS
alter table profiles enable row level security;
alter table departments enable row level security;
alter table categories enable row level security;
alter table assets enable row level security;

-- Profiles policies
drop policy if exists profiles_self_select on profiles;
create policy profiles_self_select on profiles for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update using (user_id = auth.uid());

drop policy if exists profiles_self_insert on profiles;
create policy profiles_self_insert on profiles for insert with check (user_id = auth.uid());

drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles for all using (public.is_admin());

-- Departments policies
drop policy if exists departments_read on departments;
create policy departments_read on departments for select using (auth.role() = 'authenticated');

drop policy if exists departments_admin_all on departments;
create policy departments_admin_all on departments for all using (public.is_admin());

-- Categories policies
drop policy if exists categories_read on categories;
create policy categories_read on categories for select using (auth.role() = 'authenticated');

drop policy if exists categories_admin_all on categories;
create policy categories_admin_all on categories for all using (public.is_admin());

-- Assets policies
drop policy if exists assets_own_read on assets;
create policy assets_own_read on assets for select using (created_by = auth.uid() or public.is_admin());

drop policy if exists assets_insert_self on assets;
create policy assets_insert_self on assets for insert with check (created_by = auth.uid());

drop policy if exists assets_update_self on assets;
create policy assets_update_self on assets for update using (created_by = auth.uid());

drop policy if exists assets_admin_delete on assets;
create policy assets_admin_delete on assets for delete using (public.is_admin());

-- First admin functions
drop function if exists public.set_first_admin_by_email(text);
drop function if exists public.set_first_admin_by_id(uuid);

create or replace function public.set_first_admin_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  total_profiles int;
  target_user_id uuid;
begin
  select count(*) into total_profiles from public.profiles;
  if total_profiles <> 0 then
    return null;
  end if;
  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1;
  if target_user_id is null then
    return null;
  end if;
  insert into public.profiles (user_id, role)
  values (target_user_id, 'admin')
  on conflict (user_id) do update set role = 'admin';
  return target_user_id;
end;
$$;

create or replace function public.set_first_admin_by_id(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  total_profiles int;
begin
  select count(*) into total_profiles from public.profiles;
  if total_profiles <> 0 then
    return false;
  end if;
  insert into public.profiles (user_id, role)
  values (p_user_id, 'admin')
  on conflict (user_id) do update set role = 'admin';
  return true;
end;
$$;

-- Bootstrap first admin function
create or replace function public.set_first_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  total_profiles integer;
  self_id uuid := auth.uid();
begin
  select count(*) into total_profiles from public.profiles;
  if total_profiles = 0 then
    insert into public.profiles (user_id, role)
    values (self_id, 'admin')
    on conflict (user_id) do update set role = 'admin';
    return;
  end if;
  if total_profiles = 1 then
    update public.profiles
      set role = 'admin'
    where user_id = self_id;
    return;
  end if;
end;
$$;

-- Promote a user to admin by email (callable by admins only)
create or replace function public.set_admin_by_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden';
  end if;
  update public.profiles p
    set role = 'admin'
  where p.user_id = (
    select u.id from auth.users u where u.email = p_email limit 1
  );
end;
$$;

-- Schema initialization: extensions, types, tables, indexes, and functions

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
create table if not exists public.profiles (
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

-- Promote a user to admin by email (callable by admins only)
create or replace function public.set_admin_by_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only allow callers who are admins
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

-- Bootstrap first admin: if no profiles exist, current user becomes admin.
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

  -- Case 1: No profiles yet -> make current user admin (insert or update)
  if total_profiles = 0 then
    insert into public.profiles (user_id, role)
    values (self_id, 'admin')
    on conflict (user_id) do update set role = 'admin';
    return;
  end if;

  -- Case 2: Exactly one profile and it belongs to current user -> promote to admin
  if total_profiles = 1 then
    update public.profiles
      set role = 'admin'
    where user_id = self_id;
    return;
  end if;
  -- Else: more than one profile -> no-op
end;
$$;

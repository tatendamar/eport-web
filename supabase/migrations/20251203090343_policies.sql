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

-- Profiles: users can read/update own profile
drop policy if exists profiles_self_select on profiles;
create policy profiles_self_select on profiles for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists profiles_self_update on profiles;
create policy profiles_self_update on profiles for update using (user_id = auth.uid());

-- Admins can manage profiles
drop policy if exists profiles_admin_all on profiles;
create policy profiles_admin_all on profiles for all using (public.is_admin());

-- Departments: readable to all authenticated; admins can manage
drop policy if exists departments_read on departments;
create policy departments_read on departments for select using (auth.role() = 'authenticated');

drop policy if exists departments_admin_all on departments;
create policy departments_admin_all on departments for all using (public.is_admin());

-- Categories: readable to all authenticated; admins can manage
drop policy if exists categories_read on categories;
create policy categories_read on categories for select using (auth.role() = 'authenticated');

drop policy if exists categories_admin_all on categories;
create policy categories_admin_all on categories for all using (public.is_admin());

-- Assets: users can see/insert/update their own; admins can delete any
drop policy if exists assets_own_read on assets;
create policy assets_own_read on assets for select using (created_by = auth.uid() or public.is_admin());

drop policy if exists assets_insert_self on assets;
create policy assets_insert_self on assets for insert with check (created_by = auth.uid());

drop policy if exists assets_update_self on assets;
create policy assets_update_self on assets for update using (created_by = auth.uid());

drop policy if exists assets_admin_delete on assets;
create policy assets_admin_delete on assets for delete using (public.is_admin());

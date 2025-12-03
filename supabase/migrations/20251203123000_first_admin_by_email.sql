-- Drop existing functions to allow signature changes
drop function if exists public.set_first_admin_by_email(text);
drop function if exists public.set_first_admin_by_id(uuid);

-- Promote first admin by email without requiring existing admin privileges.
-- Only runs when profiles table is empty.
-- Returns the user_id if successful, null otherwise.
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
    -- Not the first user; do nothing
    return null;
  end if;

  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = lower(p_email)
  limit 1;

  if target_user_id is null then
    -- No matching auth user yet; do nothing
    return null;
  end if;

  insert into public.profiles (user_id, role)
  values (target_user_id, 'admin')
  on conflict (user_id) do update set role = 'admin';

  return target_user_id;
end;
$$;

-- Alternative: Promote first admin by user_id directly
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

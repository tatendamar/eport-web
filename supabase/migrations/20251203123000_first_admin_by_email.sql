-- Promote first admin by email without requiring existing admin privileges.
-- Only runs when profiles table is empty.
create or replace function public.set_first_admin_by_email(p_email text)
returns void
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
    return;
  end if;

  select u.id into target_user_id
  from auth.users u
  where u.email = p_email
  limit 1;

  if target_user_id is null then
    -- No matching auth user yet; do nothing
    return;
  end if;

  insert into public.profiles (user_id, role)
  values (target_user_id, 'admin')
  on conflict (user_id) do update set role = 'admin';
end;
$$;

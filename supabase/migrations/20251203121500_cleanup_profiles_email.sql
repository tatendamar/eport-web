-- Cleanup migration: remove legacy email sync triggers/functions and drop profiles.email
-- Safe to run multiple times; guards against missing objects.

-- Try to drop common legacy trigger on auth.users
do $$
begin
  if exists (
    select 1 from pg_trigger t
    where t.tgrelid::regclass::text = 'auth.users'
      and t.tgname = 'handle_new_user'
  ) then
    execute 'drop trigger handle_new_user on auth.users';
  end if;
exception when others then
  -- ignore
end $$;

-- Drop suspected legacy functions if present
do $$
declare
  fn text;
begin
  -- list of candidate function names to drop
  foreach fn in array array['public.handle_new_user', 'public.sync_profile_email'] loop
    if exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where (n.nspname || '.' || p.proname) = fn
    ) then
      execute 'drop function ' || fn || ' cascade';
    end if;
  end loop;
end $$;

-- Finally, drop the duplicated email column from profiles (if still present)
alter table if exists public.profiles drop column if exists email;

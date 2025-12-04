-- Combined migration for eport-web
-- This file is applied automatically via GitHub Actions

-- Use pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Roles enum
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin','user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE
);

-- Profiles mapping auth.users -> role/department
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'user',
  department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Assets
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid NOT NULL REFERENCES public.categories (id) ON DELETE RESTRICT,
  department_id uuid NOT NULL REFERENCES public.departments (id) ON DELETE RESTRICT,
  date_purchased date NOT NULL,
  cost numeric(12,2) NOT NULL CHECK (cost >= 0),
  created_by uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_created_by ON public.assets (created_by);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets (category_id);
CREATE INDEX IF NOT EXISTS idx_assets_department ON public.assets (department_id);

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS profiles_self_select ON profiles;
CREATE POLICY profiles_self_select ON profiles FOR SELECT USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS profiles_self_update ON profiles;
CREATE POLICY profiles_self_update ON profiles FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_self_insert ON profiles;
CREATE POLICY profiles_self_insert ON profiles FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS profiles_admin_all ON profiles;
CREATE POLICY profiles_admin_all ON profiles FOR ALL USING (public.is_admin());

-- Departments policies
DROP POLICY IF EXISTS departments_read ON departments;
CREATE POLICY departments_read ON departments FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS departments_admin_all ON departments;
CREATE POLICY departments_admin_all ON departments FOR ALL USING (public.is_admin());

-- Categories policies
DROP POLICY IF EXISTS categories_read ON categories;
CREATE POLICY categories_read ON categories FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS categories_admin_all ON categories;
CREATE POLICY categories_admin_all ON categories FOR ALL USING (public.is_admin());

-- Assets policies
DROP POLICY IF EXISTS assets_own_read ON assets;
CREATE POLICY assets_own_read ON assets FOR SELECT USING (created_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS assets_insert_self ON assets;
CREATE POLICY assets_insert_self ON assets FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS assets_update_self ON assets;
CREATE POLICY assets_update_self ON assets FOR UPDATE USING (created_by = auth.uid());

DROP POLICY IF EXISTS assets_admin_delete ON assets;
CREATE POLICY assets_admin_delete ON assets FOR DELETE USING (public.is_admin());

-- First admin functions (with debug logging)
DROP FUNCTION IF EXISTS public.set_first_admin_by_id(uuid);
CREATE OR REPLACE FUNCTION public.set_first_admin_by_id(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_profiles int;
BEGIN
  SELECT count(*) INTO total_profiles FROM public.profiles;
  RAISE NOTICE 'set_first_admin_by_id: total_profiles=%, user_id=%', total_profiles, p_user_id;
  
  IF total_profiles <> 0 THEN
    RETURN false;
  END IF;
  
  INSERT INTO public.profiles (user_id, role)
  VALUES (p_user_id, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  
  RETURN true;
END;
$$;

DROP FUNCTION IF EXISTS public.set_first_admin_by_email(text);
CREATE OR REPLACE FUNCTION public.set_first_admin_by_email(p_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_profiles int;
  target_user_id uuid;
BEGIN
  SELECT count(*) INTO total_profiles FROM public.profiles;
  RAISE NOTICE 'set_first_admin_by_email: total_profiles=%, email=%', total_profiles, p_email;
  
  IF total_profiles <> 0 THEN
    RETURN null;
  END IF;
  
  SELECT u.id INTO target_user_id
  FROM auth.users u
  WHERE lower(u.email) = lower(p_email)
  LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RAISE NOTICE 'set_first_admin_by_email: user not found for email %', p_email;
    RETURN null;
  END IF;
  
  INSERT INTO public.profiles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
  
  RAISE NOTICE 'set_first_admin_by_email: created admin profile for user_id=%', target_user_id;
  RETURN target_user_id;
END;
$$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- RLS policies migration
-- Created by GitHub Copilot on 2025-12-02 for eport-web

-- Enable RLS
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own, admins can read/manage all
DROP POLICY IF EXISTS profiles_self_read ON profiles;
CREATE POLICY profiles_self_read ON profiles
  FOR SELECT USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS profiles_self_update ON profiles;
CREATE POLICY profiles_self_update ON profiles
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS profiles_admin_insert ON profiles;
CREATE POLICY profiles_admin_insert ON profiles
  FOR INSERT WITH CHECK (is_admin());

-- Assets: owner can read/update; admin can delete/read all
DROP POLICY IF EXISTS assets_read_own_or_admin ON assets;
CREATE POLICY assets_read_own_or_admin ON assets
  FOR SELECT USING (created_by = auth.uid() OR is_admin());

DROP POLICY IF EXISTS assets_update_own ON assets;
CREATE POLICY assets_update_own ON assets
  FOR UPDATE USING (created_by = auth.uid() OR is_admin());

DROP POLICY IF EXISTS assets_insert_auth ON assets;
CREATE POLICY assets_insert_auth ON assets
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS assets_delete_admin ON assets;
CREATE POLICY assets_delete_admin ON assets
  FOR DELETE USING (is_admin());

-- Categories/Departments: readable by authenticated users
DROP POLICY IF EXISTS categories_read_auth ON categories;
CREATE POLICY categories_read_auth ON categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS departments_read_auth ON departments;
CREATE POLICY departments_read_auth ON departments
  FOR SELECT USING (auth.uid() IS NOT NULL);

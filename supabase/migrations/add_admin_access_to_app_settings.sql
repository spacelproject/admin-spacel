-- Add RLS policies to allow admin users to update app_settings
-- This enables the admin panel to save app store URLs

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can update app_settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can insert app_settings" ON app_settings;

-- RLS Policy: Allow admins to update app_settings
CREATE POLICY "Admins can update app_settings"
  ON app_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = TRUE
      AND admin_users.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = TRUE
      AND admin_users.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policy: Allow admins to insert app_settings
CREATE POLICY "Admins can insert app_settings"
  ON app_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = TRUE
      AND admin_users.role IN ('admin', 'super_admin')
    )
  );


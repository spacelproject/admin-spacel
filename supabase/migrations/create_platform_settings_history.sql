-- Create platform_settings_history table for tracking all setting changes
CREATE TABLE IF NOT EXISTS platform_settings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  old_value JSONB,
  new_value JSONB,
  setting_type VARCHAR(20) DEFAULT 'string',
  changed_by UUID REFERENCES auth.users(id),
  changed_by_name TEXT,
  changed_by_email TEXT,
  change_reason TEXT,
  impact_level VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_platform_settings_history_setting_key ON platform_settings_history(setting_key);
CREATE INDEX IF NOT EXISTS idx_platform_settings_history_category ON platform_settings_history(category);
CREATE INDEX IF NOT EXISTS idx_platform_settings_history_created_at ON platform_settings_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_settings_history_changed_by ON platform_settings_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_platform_settings_history_impact_level ON platform_settings_history(impact_level);

-- Enable Row Level Security
ALTER TABLE platform_settings_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admins can view history
CREATE POLICY "Admins can view settings history"
  ON platform_settings_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role IN ('admin', 'super_admin')
    )
  );

-- RLS Policy: Only admins can insert history (via service role or admin functions)
CREATE POLICY "Admins can insert settings history"
  ON platform_settings_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.role IN ('admin', 'super_admin')
    )
  );


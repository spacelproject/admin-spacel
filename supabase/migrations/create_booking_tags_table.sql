-- Create booking_tags table for categorizing bookings
CREATE TABLE IF NOT EXISTS booking_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  tag_name VARCHAR(100) NOT NULL,
  tag_color VARCHAR(20) DEFAULT 'blue', -- blue, green, red, yellow, purple, orange
  created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id, tag_name)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_tags_booking_id ON booking_tags(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_tags_tag_name ON booking_tags(tag_name);
CREATE INDEX IF NOT EXISTS idx_booking_tags_created_at ON booking_tags(created_at DESC);

-- Enable RLS
ALTER TABLE booking_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only admins can view tags
CREATE POLICY "Admins can view booking tags"
  ON booking_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = TRUE
    )
  );

-- Only admins can insert tags
CREATE POLICY "Admins can insert booking tags"
  ON booking_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = TRUE
    )
  );

-- Only admins can delete tags
CREATE POLICY "Admins can delete booking tags"
  ON booking_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = TRUE
    )
  );


-- Create booking_notes table for admin-only notes on bookings
CREATE TABLE IF NOT EXISTS booking_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT TRUE, -- Internal admin notes (not visible to users)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_notes_booking_id ON booking_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_notes_admin_id ON booking_notes(admin_id);
CREATE INDEX IF NOT EXISTS idx_booking_notes_created_at ON booking_notes(created_at DESC);

-- Enable RLS
ALTER TABLE booking_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only admins can view notes
CREATE POLICY "Admins can view booking notes"
  ON booking_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = TRUE
    )
  );

-- Only admins can insert notes
CREATE POLICY "Admins can insert booking notes"
  ON booking_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = TRUE
    )
  );

-- Only admins can update their own notes
CREATE POLICY "Admins can update their own booking notes"
  ON booking_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = TRUE
    )
    AND admin_id = auth.uid()
  );

-- Only admins can delete their own notes
CREATE POLICY "Admins can delete their own booking notes"
  ON booking_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = TRUE
    )
    AND admin_id = auth.uid()
  );


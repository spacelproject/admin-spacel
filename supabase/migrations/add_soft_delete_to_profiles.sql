-- Add soft delete fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS deletion_reason TEXT;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at) WHERE deleted_at IS NULL;


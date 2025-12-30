-- Create user tags table
CREATE TABLE IF NOT EXISTS user_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  color TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_tags_user_id ON user_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tags_tag ON user_tags(tag);

-- Create unique constraint to prevent duplicate tags for same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_tags_unique ON user_tags(user_id, tag);


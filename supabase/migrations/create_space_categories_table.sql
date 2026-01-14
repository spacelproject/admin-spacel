-- Create space_categories table for managing space categories and subcategories
-- This table supports hierarchical categories using parent_id

CREATE TABLE IF NOT EXISTS space_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  parent_id UUID REFERENCES space_categories(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on parent_id for efficient subcategory queries
CREATE INDEX IF NOT EXISTS idx_space_categories_parent_id ON space_categories(parent_id);

-- Create index on is_active for filtering active categories
CREATE INDEX IF NOT EXISTS idx_space_categories_is_active ON space_categories(is_active);

-- Create index on name for quick lookups
CREATE INDEX IF NOT EXISTS idx_space_categories_name ON space_categories(name);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_space_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_space_categories_updated_at ON space_categories;
CREATE TRIGGER update_space_categories_updated_at 
    BEFORE UPDATE ON space_categories
    FOR EACH ROW 
    EXECUTE FUNCTION update_space_categories_updated_at();

-- Enable Row Level Security
ALTER TABLE space_categories ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to active categories (for partner/seeker apps)
CREATE POLICY "Public can view active categories" ON space_categories
  FOR SELECT USING (is_active = TRUE);

-- Policy: Only admins can manage categories
CREATE POLICY "Admins can manage categories" ON space_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE user_id = auth.uid() 
      AND is_active = TRUE
    )
  );

-- Insert default categories if they don't exist
INSERT INTO space_categories (name, label, parent_id, is_active, sort_order) 
VALUES 
  ('office', 'Office Space', NULL, TRUE, 1),
  ('retail', 'Retail Space', NULL, TRUE, 2),
  ('industrial', 'Industrial Space', NULL, TRUE, 3),
  ('hospitality', 'Hospitality Space', NULL, TRUE, 4),
  ('healthcare', 'Healthcare Space', NULL, TRUE, 5),
  ('mixed', 'Mixed Use Space', NULL, TRUE, 6),
  ('farm', 'Farm Space', NULL, TRUE, 7),
  ('creative', 'Creative Space', NULL, TRUE, 8),
  ('entertainment', 'Entertainment Space', NULL, TRUE, 9)
ON CONFLICT (name) DO NOTHING;

-- Insert default subcategories
-- Note: This uses a subquery to get parent IDs, so it will only work if parent categories exist
INSERT INTO space_categories (name, label, parent_id, is_active, sort_order)
SELECT 
  sub.name,
  sub.label,
  parent.id,
  TRUE,
  sub.sort_order
FROM (
  VALUES 
    ('private_office', 'Private Office', 'office', 1),
    ('coworking', 'Coworking Space', 'office', 2),
    ('storefront', 'Storefront', 'retail', 1),
    ('popup_shop', 'Pop-up Shop', 'retail', 2),
    ('warehouse', 'Warehouse', 'industrial', 1),
    ('manufacturing', 'Manufacturing', 'industrial', 2),
    ('event_hall', 'Event Hall', 'entertainment', 1),
    ('meeting_room', 'Meeting Room', 'entertainment', 2)
) AS sub(name, label, parent_name, sort_order)
INNER JOIN space_categories parent ON parent.name = sub.parent_name
WHERE NOT EXISTS (
  SELECT 1 FROM space_categories WHERE name = sub.name
);


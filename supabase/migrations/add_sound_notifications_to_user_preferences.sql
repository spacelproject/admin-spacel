-- Add sound_notifications column to user_preferences table
-- This allows users to enable/disable sound notifications when new notifications arrive

-- Add the column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_preferences' 
    AND column_name = 'sound_notifications'
  ) THEN
    ALTER TABLE user_preferences 
    ADD COLUMN sound_notifications BOOLEAN DEFAULT TRUE;
    
    -- Add comment to document the column
    COMMENT ON COLUMN user_preferences.sound_notifications IS 
      'Whether to play a sound when new notifications arrive. Defaults to true.';
  END IF;
END $$;


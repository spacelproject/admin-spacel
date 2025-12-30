-- Create admin_activity_notifications table for storing admin activity notifications in the database
-- This replaces the localStorage-based approach with a proper database-backed solution

CREATE TABLE IF NOT EXISTS admin_activity_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- booking, listing_pending, listing_resubmitted, user_reg, ticket, report, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Additional metadata (booking_id, listing_id, action_url, etc.)
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate notifications for the same activity
  -- This ensures we don't create multiple notifications for the same event
  CONSTRAINT unique_activity_notification UNIQUE (admin_user_id, activity_type, data)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_notifications_admin_user_id ON admin_activity_notifications(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_notifications_activity_type ON admin_activity_notifications(activity_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_notifications_read ON admin_activity_notifications(read);
CREATE INDEX IF NOT EXISTS idx_admin_activity_notifications_created_at ON admin_activity_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_notifications_unread ON admin_activity_notifications(admin_user_id, read) WHERE read = FALSE;

-- Enable RLS
ALTER TABLE admin_activity_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view their own notifications
CREATE POLICY "Admins can view their own activity notifications"
  ON admin_activity_notifications FOR SELECT
  USING (
    admin_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = TRUE
    )
  );

-- System can insert notifications for admins (via triggers/functions)
CREATE POLICY "System can insert activity notifications"
  ON admin_activity_notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = admin_activity_notifications.admin_user_id
      AND admin_users.is_active = TRUE
    )
  );

-- Admins can update their own notifications (mark as read)
CREATE POLICY "Admins can update their own activity notifications"
  ON admin_activity_notifications FOR UPDATE
  USING (
    admin_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
      AND admin_users.is_active = TRUE
    )
  );

-- Function to create activity notifications for all active admins
CREATE OR REPLACE FUNCTION create_admin_activity_notification(
  p_activity_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Loop through all active admin users and create notifications
  FOR admin_record IN
    SELECT user_id FROM admin_users WHERE is_active = TRUE
  LOOP
    -- Insert notification, ignoring duplicates (ON CONFLICT DO NOTHING)
    INSERT INTO admin_activity_notifications (
      admin_user_id,
      activity_type,
      title,
      message,
      data
    )
    VALUES (
      admin_record.user_id,
      p_activity_type,
      p_title,
      p_message,
      p_data
    )
    ON CONFLICT (admin_user_id, activity_type, data) DO NOTHING;
  END LOOP;
END;
$$;

-- Function to create activity notification for a specific admin
CREATE OR REPLACE FUNCTION create_admin_activity_notification_for_user(
  p_admin_user_id UUID,
  p_activity_type VARCHAR(50),
  p_title VARCHAR(255),
  p_message TEXT,
  p_data JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Check if user is an active admin
  IF NOT EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = p_admin_user_id 
    AND is_active = TRUE
  ) THEN
    RETURN NULL;
  END IF;

  -- Insert notification, ignoring duplicates
  INSERT INTO admin_activity_notifications (
    admin_user_id,
    activity_type,
    title,
    message,
    data
  )
  VALUES (
    p_admin_user_id,
    p_activity_type,
    p_title,
    p_message,
    p_data
  )
  ON CONFLICT (admin_user_id, activity_type, data) DO UPDATE
  SET created_at = NOW() -- Update timestamp if duplicate exists
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- Trigger function to create notifications when bookings are created
CREATE OR REPLACE FUNCTION notify_admins_on_booking_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  listing_name TEXT;
  seeker_name TEXT;
  booking_ref TEXT;
BEGIN
  -- Get listing name
  SELECT name INTO listing_name
  FROM listings
  WHERE id = NEW.listing_id;

  -- Get seeker name
  SELECT COALESCE(first_name || ' ' || last_name, 'User') INTO seeker_name
  FROM profiles
  WHERE id = NEW.seeker_id;

  -- Get booking reference
  booking_ref := COALESCE(NEW.booking_reference, NEW.id::TEXT);

  -- Create notification for all admins
  PERFORM create_admin_activity_notification(
    'booking',
    'New Booking',
    seeker_name || ' booked "' || COALESCE(listing_name, 'Space') || '"' || 
    CASE WHEN booking_ref IS NOT NULL THEN ' (' || booking_ref || ')' ELSE '' END,
    jsonb_build_object(
      'booking_id', NEW.id,
      'booking_reference', booking_ref,
      'listing_id', NEW.listing_id,
      'action_url', '/booking-management?booking=' || NEW.id,
      'status', NEW.status,
      'payment_status', NEW.payment_status
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger for bookings
DROP TRIGGER IF EXISTS trigger_notify_admins_on_booking_created ON bookings;
CREATE TRIGGER trigger_notify_admins_on_booking_created
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_on_booking_created();

-- Trigger function for pending listings (new and resubmissions)
CREATE OR REPLACE FUNCTION notify_admins_on_listing_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  partner_name TEXT;
  is_resubmission BOOLEAN;
  activity_type_val VARCHAR(50);
  title_val VARCHAR(255);
  message_val TEXT;
BEGIN
  -- Check if this is a resubmission
  is_resubmission := (NEW.rejected_at IS NOT NULL);
  activity_type_val := CASE WHEN is_resubmission THEN 'listing_resubmitted' ELSE 'listing_pending' END;
  title_val := CASE WHEN is_resubmission THEN 'Listing Resubmitted for Review' ELSE 'Listing Pending Approval' END;

  -- Get partner name
  SELECT COALESCE(first_name || ' ' || last_name, 'Partner') INTO partner_name
  FROM profiles
  WHERE id = NEW.partner_id;

  message_val := CASE 
    WHEN is_resubmission 
    THEN '"' || NEW.name || '" by ' || partner_name || ' has been resubmitted for review'
    ELSE '"' || NEW.name || '" by ' || partner_name || ' needs review'
  END;

  -- Create notification for all admins
  PERFORM create_admin_activity_notification(
    activity_type_val,
    title_val,
    message_val,
    jsonb_build_object(
      'listing_id', NEW.id,
      'listing_name', NEW.name,
      'action_url', '/space-management?listing=' || NEW.id,
      'status', 'pending',
      'is_resubmission', is_resubmission,
      'rejected_at', NEW.rejected_at
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger for listings (INSERT and UPDATE when status becomes pending)
DROP TRIGGER IF EXISTS trigger_notify_admins_on_listing_pending_insert ON listings;
CREATE TRIGGER trigger_notify_admins_on_listing_pending_insert
  AFTER INSERT ON listings
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_admins_on_listing_pending();

DROP TRIGGER IF EXISTS trigger_notify_admins_on_listing_pending_update ON listings;
CREATE TRIGGER trigger_notify_admins_on_listing_pending_update
  AFTER UPDATE ON listings
  FOR EACH ROW
  WHEN (NEW.status = 'pending' AND (OLD.status != 'pending' OR OLD.rejected_at IS NULL AND NEW.rejected_at IS NOT NULL))
  EXECUTE FUNCTION notify_admins_on_listing_pending();

-- Trigger function for support tickets
CREATE OR REPLACE FUNCTION notify_admins_on_ticket_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name TEXT;
BEGIN
  -- Only notify for open tickets
  IF NEW.status != 'open' THEN
    RETURN NEW;
  END IF;

  -- Get user name
  SELECT COALESCE(first_name || ' ' || last_name, 'User') INTO user_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Create notification for all admins
  PERFORM create_admin_activity_notification(
    'ticket',
    'New Support Ticket' || CASE WHEN NEW.priority = 'high' THEN ' (High Priority)' ELSE '' END,
    user_name || ': ' || NEW.subject,
    jsonb_build_object(
      'ticket_id', NEW.id,
      'action_url', '/support-ticket-system?ticket=' || NEW.id,
      'priority', NEW.priority,
      'status', NEW.status
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger for support tickets
DROP TRIGGER IF EXISTS trigger_notify_admins_on_ticket_created ON support_tickets;
CREATE TRIGGER trigger_notify_admins_on_ticket_created
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  WHEN (NEW.status = 'open')
  EXECUTE FUNCTION notify_admins_on_ticket_created();

-- Trigger function for content reports
CREATE OR REPLACE FUNCTION notify_admins_on_report_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify for pending reports
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Create notification for all admins
  PERFORM create_admin_activity_notification(
    'report',
    'Content Report' || CASE WHEN NEW.priority = 'urgent' THEN ' (Urgent)' ELSE '' END,
    'New ' || NEW.report_type || ' report: ' || NEW.report_reason,
    jsonb_build_object(
      'report_id', NEW.id,
      'action_url', '/content-management?tab=moderation&report=' || NEW.id,
      'priority', NEW.priority,
      'report_type', NEW.report_type
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger for content reports
DROP TRIGGER IF EXISTS trigger_notify_admins_on_report_created ON content_reports;
CREATE TRIGGER trigger_notify_admins_on_report_created
  AFTER INSERT ON content_reports
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION notify_admins_on_report_created();

-- Add comment to table
COMMENT ON TABLE admin_activity_notifications IS 'Stores activity notifications for admin users, replacing the localStorage-based approach';
COMMENT ON COLUMN admin_activity_notifications.activity_type IS 'Type of activity: booking, listing_pending, listing_resubmitted, user_reg, ticket, report, etc.';
COMMENT ON COLUMN admin_activity_notifications.data IS 'JSONB object containing additional metadata like booking_id, listing_id, action_url, etc.';


-- Migration: Add email notifications for pending listings and new support tickets
-- This migration sets up database functions to queue email notifications
-- 
-- Note: Since calling Edge Functions directly from triggers can be unreliable,
-- we'll use a queue table approach. The Edge Functions can then be called
-- via application code or database webhooks to process the queue.

-- Create email notification queue table
CREATE TABLE IF NOT EXISTS email_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type VARCHAR(50) NOT NULL, -- 'pending_listing' or 'new_ticket'
  entity_id UUID NOT NULL, -- listing_id or ticket_id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  metadata JSONB
);

-- Create index for efficient queue processing
CREATE INDEX IF NOT EXISTS idx_email_notification_queue_unprocessed 
ON email_notification_queue(notification_type, created_at) 
WHERE processed_at IS NULL;

-- Function to queue pending listing email notification
CREATE OR REPLACE FUNCTION queue_pending_listing_email_notification(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO email_notification_queue (notification_type, entity_id, metadata)
  VALUES ('pending_listing', listing_id, jsonb_build_object('listing_id', listing_id))
  ON CONFLICT DO NOTHING; -- Prevent duplicates
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail to not break the main transaction
    NULL;
END;
$$;

-- Function to queue new ticket email notification
CREATE OR REPLACE FUNCTION queue_new_ticket_email_notification(ticket_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO email_notification_queue (notification_type, entity_id, metadata)
  VALUES ('new_ticket', ticket_id, jsonb_build_object('ticket_id', ticket_id))
  ON CONFLICT DO NOTHING; -- Prevent duplicates
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail to not break the main transaction
    NULL;
END;
$$;

-- Alternative approach: Use pg_cron or a simpler HTTP approach
-- Since pg_net may not be available in all Supabase projects,
-- we'll also create a simpler approach using a helper function that
-- can be called from application code or via webhooks

-- Updated trigger function for pending listings to call Edge Function
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

  -- Create notification for all admins (existing functionality)
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

  -- Queue email notification (will be processed by application code or webhook)
  PERFORM queue_pending_listing_email_notification(NEW.id);

  RETURN NEW;
END;
$$;

-- Updated trigger function for support tickets to call Edge Function
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

  -- Create notification for all admins (existing functionality)
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

  -- Queue email notification (will be processed by application code or webhook)
  PERFORM queue_new_ticket_email_notification(NEW.id);

  RETURN NEW;
END;
$$;

-- Add comments
COMMENT ON TABLE email_notification_queue IS 'Queue table for email notifications. Processed by application code or webhooks.';
COMMENT ON FUNCTION queue_pending_listing_email_notification IS 'Queues a pending listing email notification to be sent to admins and support agents';
COMMENT ON FUNCTION queue_new_ticket_email_notification IS 'Queues a new ticket email notification to be sent to admins and support agents';

-- Note: The triggers are already created in create_admin_activity_notifications_table.sql
-- They will automatically use the updated functions above

-- Alternative: If you want to use Supabase Database Webhooks instead of queue table,
-- you can set up webhooks in Supabase Dashboard that call the Edge Functions directly:
-- 1. Go to Database → Webhooks in Supabase Dashboard
-- 2. Create webhook for 'listings' table INSERT/UPDATE when status = 'pending'
-- 3. Create webhook for 'support_tickets' table INSERT when status = 'open'
-- 4. Webhook URL: https://your-project.supabase.co/functions/v1/notify-pending-listing (or notify-new-ticket)
-- 5. HTTP Method: POST
-- 6. HTTP Headers: Authorization: Bearer YOUR_SERVICE_ROLE_KEY, apikey: YOUR_SERVICE_ROLE_KEY


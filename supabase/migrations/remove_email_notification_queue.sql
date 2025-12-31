-- Migration: Remove email notification queue system
-- This migration removes queue function calls from triggers since we're using Database Webhooks exclusively
--
-- Note: The email_notification_queue table and functions are kept for backward compatibility
-- but are no longer used. They can be dropped in a future migration if needed.

-- Update trigger function to remove queue calls (rely only on webhooks)
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
  is_resubmission := (NEW.rejected_at IS NOT NULL);
  activity_type_val := CASE WHEN is_resubmission THEN 'listing_resubmitted' ELSE 'listing_pending' END;
  title_val := CASE WHEN is_resubmission THEN 'Listing Resubmitted for Review' ELSE 'Listing Pending Approval' END;

  SELECT COALESCE(first_name || ' ' || last_name, 'Partner') INTO partner_name
  FROM profiles
  WHERE id = NEW.partner_id;

  message_val := CASE 
    WHEN is_resubmission 
    THEN '"' || NEW.name || '" by ' || partner_name || ' has been resubmitted for review'
    ELSE '"' || NEW.name || '" by ' || partner_name || ' needs review'
  END;

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

  -- Email notifications are handled by Database Webhooks (see WEBHOOK_SETUP_GUIDE.md)
  -- No queue or direct function calls needed

  RETURN NEW;
END;
$$;

-- Update ticket trigger function to remove queue calls (rely only on webhooks)
CREATE OR REPLACE FUNCTION notify_admins_on_ticket_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_name TEXT;
BEGIN
  IF NEW.status != 'open' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(first_name || ' ' || last_name, 'User') INTO user_name
  FROM profiles
  WHERE id = NEW.user_id;

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

  -- Email notifications are handled by Database Webhooks (see WEBHOOK_SETUP_GUIDE.md)
  -- No queue or direct function calls needed

  RETURN NEW;
END;
$$;

-- Add comments
COMMENT ON FUNCTION notify_admins_on_listing_pending() IS 
'Creates in-app notifications for admins/super_admins when a listing becomes pending. 
Email notifications are handled exclusively by Database Webhooks calling notify-pending-listing Edge Function.';

COMMENT ON FUNCTION notify_admins_on_ticket_created() IS 
'Creates in-app notifications for admins/super_admins when a new ticket is created. 
Email notifications are handled exclusively by Database Webhooks calling notify-new-ticket Edge Function.';


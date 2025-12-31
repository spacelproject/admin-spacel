-- Migration: Enable email notifications even when admins are offline
-- This migration sets up direct Edge Function calls from database triggers
-- using pg_net, so emails are sent immediately even when no admin is logged in

-- Note: The service role key needs to be configured for pg_net to work
-- You can set it via: ALTER DATABASE postgres SET app.settings.service_role_key = 'your-service-role-key';
-- Or use Supabase Database Webhooks (recommended - see setup guide)

-- Function to call pending listing Edge Function directly
CREATE OR REPLACE FUNCTION call_pending_listing_email_function(listing_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := 'https://bwgwoqywmlaevyygkafg.supabase.co';
  function_url TEXT;
  response_status INT;
  response_body TEXT;
  service_role_key TEXT;
BEGIN
  -- Try to get service role key from database settings
  -- Set via: ALTER DATABASE postgres SET app.settings.service_role_key = 'your-key';
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION
    WHEN OTHERS THEN
      service_role_key := NULL;
  END;
  
  function_url := supabase_url || '/functions/v1/notify-pending-listing';
  
  -- Call Edge Function using pg_net (if available and key is set)
  IF service_role_key IS NOT NULL THEN
    BEGIN
      SELECT status, content INTO response_status, response_body
      FROM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key,
          'apikey', service_role_key
        ),
        body := jsonb_build_object('listingId', listing_id::text)
      );
      
      -- Log if call failed
      IF response_status != 200 THEN
        RAISE WARNING 'Edge Function call returned status %: %', response_status, response_body;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- If pg_net call fails, the queue will be processed when admin logs in
        RAISE WARNING 'Could not call Edge Function directly: %', SQLERRM;
    END;
  END IF;
  -- If service_role_key is not set, the queue will be processed when admin logs in
END;
$$;

-- Function to call new ticket Edge Function directly
CREATE OR REPLACE FUNCTION call_new_ticket_email_function(ticket_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  supabase_url TEXT := 'https://bwgwoqywmlaevyygkafg.supabase.co';
  function_url TEXT;
  response_status INT;
  response_body TEXT;
  service_role_key TEXT;
BEGIN
  BEGIN
    service_role_key := current_setting('app.settings.service_role_key', true);
  EXCEPTION
    WHEN OTHERS THEN
      service_role_key := NULL;
  END;
  
  function_url := supabase_url || '/functions/v1/notify-new-ticket';
  
  IF service_role_key IS NOT NULL THEN
    BEGIN
      SELECT status, content INTO response_status, response_body
      FROM net.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key,
          'apikey', service_role_key
        ),
        body := jsonb_build_object('ticketId', ticket_id::text)
      );
      
      IF response_status != 200 THEN
        RAISE WARNING 'Edge Function call returned status %: %', response_status, response_body;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Could not call Edge Function directly: %', SQLERRM;
    END;
  END IF;
END;
$$;

-- Update trigger function to call Edge Function directly
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

-- Update ticket trigger function to call Edge Function directly
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


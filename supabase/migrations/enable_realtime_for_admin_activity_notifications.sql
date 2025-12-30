-- Enable real-time replication for admin_activity_notifications table
-- This allows Supabase real-time subscriptions to work for this table
-- Without this, the real-time subscriptions in the frontend won't receive updates

-- Add the table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE admin_activity_notifications;

-- Note: This enables real-time for INSERT, UPDATE, and DELETE events
-- The frontend code in NotificationService.subscribeToNotifications() 
-- already has subscriptions set up for INSERT and UPDATE events


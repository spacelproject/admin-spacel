-- Direct SQL Script to Clean All Notifications and Messages
-- 
-- WARNING: This will DELETE ALL notification and message records permanently!
-- This cannot be undone. Make sure you have a backup if needed.
--
-- To run this:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Copy and paste this entire script
-- 3. Click "Run" or press Ctrl+Enter
--
-- Or use Supabase CLI:
--   supabase db execute -f scripts/clean-notifications-and-messages-direct.sql

BEGIN;

-- Show counts before deletion
DO $$
DECLARE
  notifications_count INT;
  admin_notifications_count INT;
  messages_count INT;
  conversations_count INT;
  chat_messages_count INT;
  chats_count INT;
  ticket_messages_count INT;
  conversation_participants_count INT;
  message_deletions_count INT;
  notification_preferences_count INT;
  notification_processing_count INT;
BEGIN
  SELECT COUNT(*) INTO notifications_count FROM notifications;
  SELECT COUNT(*) INTO admin_notifications_count FROM admin_notifications;
  SELECT COUNT(*) INTO messages_count FROM messages;
  SELECT COUNT(*) INTO conversations_count FROM conversations;
  SELECT COUNT(*) INTO chat_messages_count FROM chat_messages;
  SELECT COUNT(*) INTO chats_count FROM chats;
  SELECT COUNT(*) INTO ticket_messages_count FROM ticket_messages;
  SELECT COUNT(*) INTO conversation_participants_count FROM conversation_participants;
  SELECT COUNT(*) INTO message_deletions_count FROM message_deletions;
  SELECT COUNT(*) INTO notification_preferences_count FROM notification_preferences;
  SELECT COUNT(*) INTO notification_processing_count FROM notification_processing;
  
  RAISE NOTICE 'Records to be deleted:';
  RAISE NOTICE '  - Notifications: %', notifications_count;
  RAISE NOTICE '  - Admin Notifications: %', admin_notifications_count;
  RAISE NOTICE '  - Messages: %', messages_count;
  RAISE NOTICE '  - Conversations: %', conversations_count;
  RAISE NOTICE '  - Chat Messages: %', chat_messages_count;
  RAISE NOTICE '  - Chats: %', chats_count;
  RAISE NOTICE '  - Ticket Messages: %', ticket_messages_count;
  RAISE NOTICE '  - Conversation Participants: %', conversation_participants_count;
  RAISE NOTICE '  - Message Deletions: %', message_deletions_count;
  RAISE NOTICE '  - Notification Preferences: %', notification_preferences_count;
  RAISE NOTICE '  - Notification Processing: %', notification_processing_count;
END $$;

-- Delete in order to respect foreign key constraints

-- 1. Delete notification_processing (references notifications)
DELETE FROM notification_processing;
RAISE NOTICE 'Deleted notification_processing';

-- 2. Delete notifications
DELETE FROM notifications;
RAISE NOTICE 'Deleted notifications';

-- 3. Delete admin_notifications
DELETE FROM admin_notifications;
RAISE NOTICE 'Deleted admin_notifications';

-- 4. Delete notification_preferences
DELETE FROM notification_preferences;
RAISE NOTICE 'Deleted notification_preferences';

-- 5. Delete message_deletions (references messages)
DELETE FROM message_deletions;
RAISE NOTICE 'Deleted message_deletions';

-- 6. Delete conversation_participants (references conversations and messages)
DELETE FROM conversation_participants;
RAISE NOTICE 'Deleted conversation_participants';

-- 7. Delete messages (references conversations)
DELETE FROM messages;
RAISE NOTICE 'Deleted messages';

-- 8. Delete conversations
DELETE FROM conversations;
RAISE NOTICE 'Deleted conversations';

-- 9. Delete chat_participants (references chats)
DELETE FROM chat_participants;
RAISE NOTICE 'Deleted chat_participants';

-- 10. Delete chat_messages (references chats)
DELETE FROM chat_messages;
RAISE NOTICE 'Deleted chat_messages';

-- 11. Delete chats
DELETE FROM chats;
RAISE NOTICE 'Deleted chats';

-- 12. Delete ticket_messages (references support_tickets)
DELETE FROM ticket_messages;
RAISE NOTICE 'Deleted ticket_messages';

-- Show final counts
DO $$
DECLARE
  notifications_count INT;
  admin_notifications_count INT;
  messages_count INT;
  conversations_count INT;
  chat_messages_count INT;
  chats_count INT;
  ticket_messages_count INT;
  conversation_participants_count INT;
  message_deletions_count INT;
  notification_preferences_count INT;
  notification_processing_count INT;
BEGIN
  SELECT COUNT(*) INTO notifications_count FROM notifications;
  SELECT COUNT(*) INTO admin_notifications_count FROM admin_notifications;
  SELECT COUNT(*) INTO messages_count FROM messages;
  SELECT COUNT(*) INTO conversations_count FROM conversations;
  SELECT COUNT(*) INTO chat_messages_count FROM chat_messages;
  SELECT COUNT(*) INTO chats_count FROM chats;
  SELECT COUNT(*) INTO ticket_messages_count FROM ticket_messages;
  SELECT COUNT(*) INTO conversation_participants_count FROM conversation_participants;
  SELECT COUNT(*) INTO message_deletions_count FROM message_deletions;
  SELECT COUNT(*) INTO notification_preferences_count FROM notification_preferences;
  SELECT COUNT(*) INTO notification_processing_count FROM notification_processing;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Final counts (should all be 0):';
  RAISE NOTICE '  - Notifications: %', notifications_count;
  RAISE NOTICE '  - Admin Notifications: %', admin_notifications_count;
  RAISE NOTICE '  - Messages: %', messages_count;
  RAISE NOTICE '  - Conversations: %', conversations_count;
  RAISE NOTICE '  - Chat Messages: %', chat_messages_count;
  RAISE NOTICE '  - Chats: %', chats_count;
  RAISE NOTICE '  - Ticket Messages: %', ticket_messages_count;
  RAISE NOTICE '  - Conversation Participants: %', conversation_participants_count;
  RAISE NOTICE '  - Message Deletions: %', message_deletions_count;
  RAISE NOTICE '  - Notification Preferences: %', notification_preferences_count;
  RAISE NOTICE '  - Notification Processing: %', notification_processing_count;
END $$;

COMMIT;


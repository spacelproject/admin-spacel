/**
 * Clean All Notifications and Messages Script
 * 
 * WARNING: This script will DELETE ALL notification and message records from the database.
 * This is a destructive operation and cannot be undone.
 * 
 * Usage:
 *   node scripts/clean-all-notifications-messages.js
 * 
 * For dry run (preview only):
 *   node scripts/clean-all-notifications-messages.js --dry-run
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const dryRun = process.argv.includes('--dry-run');

async function getRecordCounts() {
  console.log('📊 Getting record counts...\n');
  
  const counts = {};
  
  // Count notifications
  const { count: notificationsCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true });
  counts.notifications = notificationsCount || 0;
  
  // Count admin_notifications
  const { count: adminNotificationsCount } = await supabase
    .from('admin_notifications')
    .select('*', { count: 'exact', head: true });
  counts.admin_notifications = adminNotificationsCount || 0;
  
  // Count messages
  const { count: messagesCount } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true });
  counts.messages = messagesCount || 0;
  
  // Count conversations
  const { count: conversationsCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true });
  counts.conversations = conversationsCount || 0;
  
  // Count chat_messages
  const { count: chatMessagesCount } = await supabase
    .from('chat_messages')
    .select('*', { count: 'exact', head: true });
  counts.chat_messages = chatMessagesCount || 0;
  
  // Count chats
  const { count: chatsCount } = await supabase
    .from('chats')
    .select('*', { count: 'exact', head: true });
  counts.chats = chatsCount || 0;
  
  // Count ticket_messages
  const { count: ticketMessagesCount } = await supabase
    .from('ticket_messages')
    .select('*', { count: 'exact', head: true });
  counts.ticket_messages = ticketMessagesCount || 0;
  
  // Count conversation_participants
  const { count: conversationParticipantsCount } = await supabase
    .from('conversation_participants')
    .select('*', { count: 'exact', head: true });
  counts.conversation_participants = conversationParticipantsCount || 0;
  
  // Count message_deletions
  const { count: messageDeletionsCount } = await supabase
    .from('message_deletions')
    .select('*', { count: 'exact', head: true });
  counts.message_deletions = messageDeletionsCount || 0;
  
  // Count notification_preferences
  const { count: notificationPreferencesCount } = await supabase
    .from('notification_preferences')
    .select('*', { count: 'exact', head: true });
  counts.notification_preferences = notificationPreferencesCount || 0;
  
  // Count notification_processing
  const { count: notificationProcessingCount } = await supabase
    .from('notification_processing')
    .select('*', { count: 'exact', head: true });
  counts.notification_processing = notificationProcessingCount || 0;
  
  return counts;
}

async function cleanAllData() {
  console.log('🧹 Starting cleanup process...\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No data will be deleted\n');
  } else {
    console.log('⚠️  WARNING: This will DELETE ALL data!\n');
  }
  
  // Get counts first
  const counts = await getRecordCounts();
  
  console.log('📋 Records to be deleted:');
  console.log(`   - Notifications: ${counts.notifications}`);
  console.log(`   - Admin Notifications: ${counts.admin_notifications}`);
  console.log(`   - Messages: ${counts.messages}`);
  console.log(`   - Conversations: ${counts.conversations}`);
  console.log(`   - Chat Messages: ${counts.chat_messages}`);
  console.log(`   - Chats: ${counts.chats}`);
  console.log(`   - Ticket Messages: ${counts.ticket_messages}`);
  console.log(`   - Conversation Participants: ${counts.conversation_participants}`);
  console.log(`   - Message Deletions: ${counts.message_deletions}`);
  console.log(`   - Notification Preferences: ${counts.notification_preferences}`);
  console.log(`   - Notification Processing: ${counts.notification_processing}`);
  console.log('');
  
  if (dryRun) {
    console.log('✅ Dry run complete. No data was deleted.');
    console.log('   Run without --dry-run to actually delete the data.');
    return;
  }
  
  // Delete in order to respect foreign key constraints
  const results = {
    deleted: {},
    errors: []
  };
  
  try {
    const tables = [
      { name: 'notification_processing', order: 1 },
      { name: 'notifications', order: 2 },
      { name: 'admin_notifications', order: 3 },
      { name: 'notification_preferences', order: 4 },
      { name: 'message_deletions', order: 5 },
      { name: 'conversation_participants', order: 6 },
      { name: 'messages', order: 7 },
      { name: 'conversations', order: 8 },
      { name: 'chat_participants', order: 9 },
      { name: 'chat_messages', order: 10 },
      { name: 'chats', order: 11 },
      { name: 'ticket_messages', order: 12 }
    ];
    
    for (const table of tables) {
      const count = counts[table.name] || 0;
      console.log(`${table.order}️⃣  Deleting ${table.name}...`);
      
      const { error } = await supabase
        .from(table.name)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      
      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        results.errors.push({ table: table.name, error: error.message });
      } else {
        results.deleted[table.name] = count;
        console.log(`   ✅ Deleted ${count} ${table.name}`);
      }
    }
    
    console.log('\n✅ Cleanup complete!\n');
    
    // Summary
    console.log('📊 Summary:');
    Object.entries(results.deleted).forEach(([table, count]) => {
      console.log(`   - ${table}: ${count} deleted`);
    });
    
    if (results.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      results.errors.forEach(({ table, error }) => {
        console.log(`   - ${table}: ${error}`);
      });
    }
    
    // Verify deletion
    console.log('\n🔍 Verifying deletion...');
    const finalCounts = await getRecordCounts();
    const allZero = Object.values(finalCounts).every(count => count === 0);
    
    if (allZero) {
      console.log('✅ All records successfully deleted!');
    } else {
      console.log('⚠️  Some records may still exist:');
      Object.entries(finalCounts).forEach(([table, count]) => {
        if (count > 0) {
          console.log(`   - ${table}: ${count} remaining`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Fatal error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanAllData()
  .then(() => {
    console.log('\n✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


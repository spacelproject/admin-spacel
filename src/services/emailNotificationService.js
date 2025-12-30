/**
 * Email Notification Service
 * Processes email notification queue and sends emails via Edge Functions
 */

import { supabase } from '../lib/supabase';
import { logDebug, logError, logWarn } from '../utils/logger';

class EmailNotificationService {
  /**
   * Process pending email notifications from the queue
   * This should be called periodically or after relevant database operations
   */
  static async processNotificationQueue() {
    try {
      // Fetch unprocessed notifications (limit to 50 at a time)
      const { data: notifications, error: fetchError } = await supabase
        .from('email_notification_queue')
        .select('*')
        .is('processed_at', null)
        .order('created_at', { ascending: true })
        .limit(50);

      if (fetchError) {
        logError('Error fetching email notification queue:', fetchError);
        return;
      }

      if (!notifications || notifications.length === 0) {
        return; // No notifications to process
      }

      logDebug(`Processing ${notifications.length} email notifications from queue`);

      // Process each notification
      for (const notification of notifications) {
        try {
          await this.processNotification(notification);
          
          // Mark as processed
          await supabase
            .from('email_notification_queue')
            .update({ 
              processed_at: new Date().toISOString(),
              attempts: notification.attempts + 1
            })
            .eq('id', notification.id);
            
        } catch (error) {
          logError(`Error processing notification ${notification.id}:`, error);
          
          // Update attempts and error message
          await supabase
            .from('email_notification_queue')
            .update({
              attempts: (notification.attempts || 0) + 1,
              last_error: error.message || String(error)
            })
            .eq('id', notification.id);
          
          // If too many attempts, mark as failed (don't retry forever)
          if ((notification.attempts || 0) >= 3) {
            await supabase
              .from('email_notification_queue')
              .update({ 
                processed_at: new Date().toISOString(), // Mark as processed to stop retrying
                last_error: `Failed after ${notification.attempts + 1} attempts: ${error.message || String(error)}`
              })
              .eq('id', notification.id);
          }
        }
      }
    } catch (error) {
      logError('Error processing email notification queue:', error);
    }
  }

  /**
   * Process a single notification by calling the appropriate Edge Function
   */
  static async processNotification(notification) {
    const { notification_type, entity_id } = notification;

    if (notification_type === 'pending_listing') {
      await this.sendPendingListingNotification(entity_id);
    } else if (notification_type === 'new_ticket') {
      await this.sendNewTicketNotification(entity_id);
    } else {
      throw new Error(`Unknown notification type: ${notification_type}`);
    }
  }

  /**
   * Send email notification for pending listing
   */
  static async sendPendingListingNotification(listingId) {
    try {
      logDebug('Sending pending listing email notification:', listingId);

      const { error } = await supabase.functions.invoke('notify-pending-listing', {
        body: { listingId }
      });

      if (error) {
        throw error;
      }

      logDebug('Pending listing email notification sent successfully');
    } catch (error) {
      logError('Error sending pending listing notification:', error);
      throw error;
    }
  }

  /**
   * Send email notification for new support ticket
   */
  static async sendNewTicketNotification(ticketId) {
    try {
      logDebug('Sending new ticket email notification:', ticketId);

      const { error } = await supabase.functions.invoke('notify-new-ticket', {
        body: { ticketId }
      });

      if (error) {
        throw error;
      }

      logDebug('New ticket email notification sent successfully');
    } catch (error) {
      logError('Error sending new ticket notification:', error);
      throw error;
    }
  }

  /**
   * Send pending listing notification immediately (bypasses queue)
   * Useful for testing or immediate notifications
   */
  static async sendPendingListingNotificationImmediate(listingId) {
    return this.sendPendingListingNotification(listingId);
  }

  /**
   * Send new ticket notification immediately (bypasses queue)
   * Useful for testing or immediate notifications
   */
  static async sendNewTicketNotificationImmediate(ticketId) {
    return this.sendNewTicketNotification(ticketId);
  }
}

export default EmailNotificationService;


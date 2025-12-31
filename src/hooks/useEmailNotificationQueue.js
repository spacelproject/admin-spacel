/**
 * Hook to process email notification queue
 * Processes queued email notifications and sends them via Edge Functions
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import EmailNotificationService from '../services/emailNotificationService';
import { logDebug, logError } from '../utils/logger';
import { supabase } from '../lib/supabase';

export const useEmailNotificationQueue = () => {
  const { user, isAdmin } = useAuth();
  const processingRef = useRef(false);
  const intervalRef = useRef(null);

  /**
   * Process the email notification queue
   */
  const processQueue = async () => {
    // Only process if user is admin and not already processing
    if (!isAdmin || processingRef.current) {
      return;
    }

    try {
      processingRef.current = true;
      logDebug('Processing email notification queue...');
      await EmailNotificationService.processNotificationQueue();
    } catch (error) {
      logError('Error processing email notification queue:', error);
    } finally {
      processingRef.current = false;
    }
  };

  /**
   * Set up real-time subscription to process queue when new items are added
   */
  useEffect(() => {
    if (!isAdmin) return;

    // Process queue immediately on mount
    processQueue();

    // Process queue periodically (every 30 seconds)
    intervalRef.current = setInterval(() => {
      processQueue();
    }, 30000); // 30 seconds

    // Subscribe to email_notification_queue table for real-time updates
    const channel = supabase
      .channel('email_notification_queue_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'email_notification_queue',
          filter: 'processed_at=is.null'
        },
        (payload) => {
          logDebug('New email notification queued, processing...', payload);
          // Process queue when new item is added
          setTimeout(() => processQueue(), 1000); // Small delay to ensure transaction is committed
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      channel.unsubscribe();
    };
  }, [isAdmin]);

  return {
    processQueue
  };
};



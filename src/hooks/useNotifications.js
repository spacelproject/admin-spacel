import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import NotificationService from '../services/notificationService'
import { playNotificationSound, isSoundNotificationEnabled } from '../utils/soundNotification'
import EmailNotificationService from '../services/emailNotificationService'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()
  
  // Track notifications that have already played sound to prevent duplicate sounds
  // Use useRef to persist across renders
  const soundPlayedForNotifications = useRef(new Set())
  // Track if initial load is complete to prevent sounds on page load
  const initialLoadComplete = useRef(false)
  
  // Helper function to check and mark sound as played
  const playSoundIfNotPlayed = useCallback((notificationId) => {
    if (soundPlayedForNotifications.current.has(notificationId)) {
      console.log('🔇 Sound already played for notification:', notificationId)
      return false
    }
    soundPlayedForNotifications.current.add(notificationId)
    return true
  }, [])

      const fetchNotifications = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      const result = await NotificationService.getUserNotifications(user.id, 100)
      
      if (result.success) {
        // Calculate unread count BEFORE updating state to ensure accuracy
        const unread = result.data.filter(n => !n.read).length
        
        // Store previous state for comparison
        setNotifications(prev => {
          // Check if this is the initial load (prev is empty)
          const isInitialLoad = prev.length === 0
          
          // Mark initial load as complete after first fetch
          if (isInitialLoad) {
            initialLoadComplete.current = true
            // Mark all existing notifications as "sound played" to prevent sounds on initial load
            result.data.forEach(n => {
              soundPlayedForNotifications.current.add(n.id)
            })
            console.log('📋 Initial load complete - sounds disabled for existing notifications')
          }
          
          // Only check for new notifications if initial load is complete
          // This prevents sounds from playing when user first opens the web
          if (initialLoadComplete.current && !isInitialLoad) {
            // Check if there are new unread notifications (for sound playback)
            // This handles the case where real-time isn't working
            const previousUnreadCount = prev.filter(n => !n.read).length
            const hasNewNotifications = result.data.length > prev.length
            const hasNewUnread = unread > previousUnreadCount
            
            if (hasNewNotifications && hasNewUnread) {
              // Find the newest notification that wasn't in the previous list
              const newNotifications = result.data.filter(n => 
                !prev.some(pn => pn.id === n.id) && !n.read
              )
              
              if (newNotifications.length > 0) {
                const newestNotification = newNotifications[0]
                console.log('🔔 New notification detected via fetch (real-time may not be working):', newestNotification.id)
                
                // Play sound notification if enabled (only once per notification)
                const notificationId = newestNotification.id
                
                // Check if we've already played sound for this notification
                if (!soundPlayedForNotifications.current.has(notificationId)) {
                  soundPlayedForNotifications.current.add(notificationId)
                  
                  // Play sound notification if enabled (use setTimeout to avoid blocking state update)
                  setTimeout(() => {
                    console.log('🔊 Checking sound notification preference...')
                    isSoundNotificationEnabled(user.id).then(enabled => {
                      console.log('🔊 Sound notification enabled:', enabled)
                      if (enabled) {
                        console.log('🔊 Playing notification sound (fallback - from fetch)...')
                        playNotificationSound()
                      } else {
                        console.log('🔇 Sound notifications disabled by user')
                      }
                    }).catch(err => {
                      console.warn('Error checking sound notification preference:', err)
                      // Default to playing sound if we can't check preference
                      console.log('🔊 Playing sound (default - preference check failed)')
                      playNotificationSound()
                    })
                  }, 100)
                } else {
                  console.log('🔇 Sound already played for this notification (fallback), skipping')
                }
              }
            }
          }
          
          return result.data
        })
        
        setUnreadCount(unread)
        console.log(`📊 Notification count updated: ${unread} unread out of ${result.data.length} total`)
      } else {
        setError(result.error)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const markAsRead = useCallback(async (notificationId) => {
    try {
      // Check if notification is already read before marking
      const currentNotification = notifications.find(n => n.id === notificationId)
      const wasAlreadyRead = currentNotification?.read === true
      
      // If already read, no need to do anything
      if (wasAlreadyRead) {
        console.log('Notification already marked as read:', notificationId)
        return { success: true, data: { id: notificationId, read: true } }
      }
      
      const result = await NotificationService.markAsRead(notificationId)
      
      if (result.success) {
        // Update local state immediately for instant UI feedback
        setNotifications(prev => {
          const updated = prev.map(notification => 
            notification.id === notificationId 
              ? { 
                  ...notification, 
                  read: true, 
                  read_at: result.data?.read_at || notification.read_at || new Date().toISOString() 
                }
              : notification
          )
          // Recalculate unread count from updated notifications array
          const unread = updated.filter(n => !n.read).length
          setUnreadCount(unread)
          console.log(`✅ Notification marked as read. Unread count: ${unread}`)
          return updated
        })
        
        // Fallback: Refresh after a short delay to ensure consistency
        // This handles cases where real-time events might be delayed or not fire
        setTimeout(() => {
          fetchNotifications()
        }, 500)
      } else {
        // If marking as read failed, refresh to get accurate state
        setTimeout(() => {
          fetchNotifications()
        }, 500)
      }
      
      return result
    } catch (err) {
      console.error('Error marking notification as read:', err)
      return { success: false, error: err.message }
    }
  }, [notifications, fetchNotifications])

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) {
      console.warn('Cannot mark all as read: No user ID')
      return { success: false, error: 'No user ID' }
    }

    try {
      console.log('Marking all notifications as read...')
      
      // Mark all notifications (regular and admin activity) as read in database
      const result = await NotificationService.markAllAsRead(user.id)
      
      // Update local state immediately
      setNotifications(prev => {
        const updated = prev.map(notification => ({
          ...notification, 
          read: true, 
          read_at: notification.read_at || new Date().toISOString()
        }))
        console.log(`✅ Marked ${updated.length} notifications as read`)
        return updated
      })
      
      // Reset unread count immediately
      setUnreadCount(0)
      console.log('✅ All notifications marked as read. Count reset to 0')
      
      // Refresh after a short delay to ensure consistency with database
      // This ensures any new notifications that came in during the mark-all operation are included
      setTimeout(() => {
        fetchNotifications()
      }, 500)
      
      // Return success even if database update failed, since we updated local state
      return { success: true, data: result.data || [] }
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      // Still update local state even if database update fails
      setNotifications(prev => {
        return prev.map(notification => ({
          ...notification, 
          read: true, 
          read_at: notification.read_at || new Date().toISOString()
        }))
      })
      setUnreadCount(0)
      
      // Refresh after a short delay to ensure consistency
      setTimeout(() => {
        fetchNotifications()
      }, 300)
      
      return { success: false, error: err.message }
    }
  }, [user?.id, notifications, fetchNotifications])

  const refreshNotifications = useCallback(() => {
    fetchNotifications()
  }, [fetchNotifications])

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) {
      // Reset initial load flag when user logs out
      initialLoadComplete.current = false
      soundPlayedForNotifications.current.clear()
      return
    }

    // Reset initial load flag when user changes (e.g., different user logs in)
    initialLoadComplete.current = false
    soundPlayedForNotifications.current.clear()

    // Initial fetch
    fetchNotifications()

    // Track shown notifications to prevent duplicates
    const shownNotificationIds = new Set()

    // Helper function to show browser push notification
    const showBrowserNotification = async (notification) => {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        console.log('Browser does not support notifications')
        return
      }

      // Deduplicate: Check if we've already shown this notification
      const notificationId = notification.id || notification.created_at
      const notificationTag = notification.data?.announcement_id 
        ? `announcement_${notification.data.announcement_id}` 
        : notificationId

      // For announcements, use announcement_id as tag to prevent duplicates
      if (shownNotificationIds.has(notificationTag)) {
        console.log('Push notification already shown for:', notificationTag)
        return
      }

      // Check user preferences for push notifications
      try {
        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('push_notifications')
          .eq('user_id', user.id)
          .single()

        // Default to true if preference not set
        const pushEnabled = preferences?.push_notifications ?? true

        if (!pushEnabled) {
          console.log('Push notifications disabled by user')
          return
        }
      } catch (error) {
        console.warn('Error checking push notification preference:', error)
        // Continue anyway - default to enabled
      }

      // Check if permission is granted
      if (Notification.permission === 'granted') {
        // Mark as shown before creating notification
        shownNotificationIds.add(notificationTag)
        
        // Clean up old entries (keep only last 50 to prevent memory leak)
        if (shownNotificationIds.size > 50) {
          const firstEntry = shownNotificationIds.values().next().value
          shownNotificationIds.delete(firstEntry)
        }

        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: notificationTag, // Use tag to replace notifications with same tag
          data: notification.data
        })
      } else if (Notification.permission === 'default') {
        // Request permission (only once)
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            // Mark as shown before creating notification
            shownNotificationIds.add(notificationTag)
            
            // Clean up old entries
            if (shownNotificationIds.size > 50) {
              const firstEntry = shownNotificationIds.values().next().value
              shownNotificationIds.delete(firstEntry)
            }

            new Notification(notification.title, {
              body: notification.message,
              icon: '/favicon.ico',
              badge: '/favicon.ico',
              tag: notificationTag, // Use tag to replace notifications with same tag
              data: notification.data
            })
          }
        })
      }
    }

    // Set up real-time subscription for database notifications (both regular and admin activity)
    const subscription = NotificationService.subscribeToNotifications(
      user.id,
      (payload) => {
        console.log('🔔 Notification event received:', payload)
        console.log('Event type:', payload.eventType, 'Has old:', !!payload.old, 'Has new:', !!payload.new)
        
        if (payload?.new) {
          const notification = payload.new
          // Check if this is an UPDATE event (either by eventType or presence of old property)
          const isUpdate = payload.eventType === 'UPDATE' || payload.old !== undefined
          
          if (isUpdate) {
            // This is an UPDATE event (e.g., notification marked as read)
            console.log('Notification updated:', notification.id, 'read:', notification.read)
            
            setNotifications(prev => {
              // Check if notification exists and if the read status actually changed
              const existing = prev.find(n => n.id === notification.id)
              if (existing && existing.read === notification.read) {
                // No change needed, already in correct state
                return prev
              }
              
              const updated = prev.map(n => 
                n.id === notification.id 
                  ? { ...n, read: notification.read, read_at: notification.read_at }
                  : n
              )
              
              // Recalculate unread count from updated array
              const unread = updated.filter(n => !n.read).length
              setUnreadCount(unread)
              console.log(`📊 Real-time count update: ${unread} unread`)
              
              return updated
            })
          } else {
            // This is an INSERT event (new notification)
            console.log('New notification received:', notification.id)
            
            // Add new notification to the list
            setNotifications(prev => {
              // Check if notification already exists to avoid duplicates
              const exists = prev.some(n => n.id === notification.id)
              if (exists) return prev
              
              const updated = [notification, ...prev]
              
              // Recalculate unread count (new notification is unread by default)
              const unread = updated.filter(n => !n.read).length
              setUnreadCount(unread)
              
              return updated
            })
            
            // Show browser push notification only for new notifications
            showBrowserNotification(notification)
            
            // Play sound notification if enabled (only once per notification)
            if (!soundPlayedForNotifications.current.has(notification.id)) {
              soundPlayedForNotifications.current.add(notification.id)
              console.log('🔊 Checking sound notification preference...')
              isSoundNotificationEnabled(user.id).then(enabled => {
                console.log('🔊 Sound notification enabled:', enabled)
                if (enabled) {
                  console.log('🔊 Playing notification sound...')
                  playNotificationSound()
                } else {
                  console.log('🔇 Sound notifications disabled by user')
                }
              }).catch(err => {
                console.warn('Error checking sound notification preference:', err)
                // Default to playing sound if we can't check preference
                console.log('🔊 Playing sound (default - preference check failed)')
                playNotificationSound()
              })
            } else {
              console.log('🔇 Sound already played for this notification, skipping')
            }
            
            // Note: Email notifications are handled by the queue processor (useEmailNotificationQueue)
            // The database trigger already queues the email, so we don't need to send it again here
            // This prevents duplicate emails from being sent
          }
        }
      }
    )

    // Set up real-time subscriptions for admin activities
    // These will trigger when new bookings, listings, tickets, etc. are created
    let activitySubscriptions = []
    
    // Debounce function to prevent too many rapid refreshes
    let refreshTimeout = null
    const debouncedRefresh = () => {
      if (refreshTimeout) clearTimeout(refreshTimeout)
      refreshTimeout = setTimeout(() => {
        fetchNotifications()
      }, 1000) // Wait 1 second before refreshing to batch multiple changes
    }
    
    if (user?.id) {
      // Subscribe to bookings
      const bookingsChannel = supabase
        .channel(`admin-bookings:${user.id}`)
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bookings'
          },
          debouncedRefresh
        )
        .subscribe()
      activitySubscriptions.push(bookingsChannel)

      // Subscribe to listings - both new submissions and resubmissions
      const listingsChannel = supabase
        .channel(`admin-listings:${user.id}`)
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'listings',
            filter: 'status=eq.pending'
          },
          debouncedRefresh
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'listings',
            filter: 'status=eq.pending'
          },
          debouncedRefresh
        )
        .subscribe()
      activitySubscriptions.push(listingsChannel)

      // Subscribe to support tickets
      const ticketsChannel = supabase
        .channel(`admin-tickets:${user.id}`)
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'support_tickets',
            filter: 'status=eq.open'
          },
          debouncedRefresh
        )
        .subscribe()
      activitySubscriptions.push(ticketsChannel)

      // Subscribe to content reports
      const reportsChannel = supabase
        .channel(`admin-reports:${user.id}`)
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'content_reports',
            filter: 'status=eq.pending'
          },
          debouncedRefresh
        )
        .subscribe()
      activitySubscriptions.push(reportsChannel)
    }

    return () => {
      subscription.unsubscribe()
      activitySubscriptions.forEach(sub => sub.unsubscribe())
      if (refreshTimeout) clearTimeout(refreshTimeout)
    }
  }, [user?.id, fetchNotifications])

  // Format notification time
  const formatNotificationTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    
    return date.toLocaleDateString()
  }

  // Get notifications by type
  const getNotificationsByType = (type) => {
    return notifications.filter(notification => notification.type === type)
  }

  // Get recent notifications (last 24 hours)
  const getRecentNotifications = () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return notifications.filter(notification => 
      new Date(notification.created_at) > oneDayAgo
    )
  }

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    formatNotificationTime,
    getNotificationsByType,
    getRecentNotifications
  }
}

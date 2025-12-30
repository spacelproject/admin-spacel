import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import NotificationService from '../services/notificationService'

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user } = useAuth()

      const fetchNotifications = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)

      const result = await NotificationService.getUserNotifications(user.id, 100)
      
      if (result.success) {
        // Calculate unread count BEFORE updating state to ensure accuracy
        const unread = result.data.filter(n => !n.read).length
        
        setNotifications(result.data)
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
        // For activity notifications (non-UUID), we need to refresh to get updated read state from localStorage
        const isActivityNotification = !NotificationService.isValidUUID(notificationId)
        
        if (isActivityNotification) {
          // For activity notifications, localStorage is already updated by markAsRead
          // Just update local state immediately - no need to refetch since read status is in localStorage
          setNotifications(prev => {
            const updated = prev.map(notification => 
              notification.id === notificationId 
                ? { ...notification, read: true, read_at: notification.read_at || new Date().toISOString() }
                : notification
            )
            // Recalculate unread count immediately from updated array
            const unread = updated.filter(n => !n.read).length
            setUnreadCount(unread)
            console.log(`✅ Activity notification marked as read. Unread count: ${unread}`)
            return updated
          })
          // No need to refetch - localStorage persistence is handled, and local state is updated
        } else {
          // For database notifications, update local state immediately
          setNotifications(prev => {
            const updated = prev.map(notification => 
              notification.id === notificationId 
                ? { ...notification, read: true, read_at: notification.read_at || new Date().toISOString() }
                : notification
            )
            // Recalculate unread count from updated notifications array
            const unread = updated.filter(n => !n.read).length
            setUnreadCount(unread)
            console.log(`✅ Notification marked as read. Unread count: ${unread}`)
            return updated
          })
        }
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
      
      // Get all activity notification IDs and mark them as read in localStorage FIRST
      const activityNotificationIds = notifications
        .filter(n => !NotificationService.isValidUUID(n.id))
        .map(n => n.id)
      
      if (activityNotificationIds.length > 0) {
        NotificationService.markAllActivityNotificationsRead(user.id, activityNotificationIds)
      }
      
      // Mark all real notifications (from database) as read
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
      
      // Refresh after a short delay to ensure consistency with database and localStorage
      // This ensures any new notifications that came in during the mark-all operation are included
      setTimeout(() => {
        fetchNotifications()
      }, 300)
      
      // Return success even if database update failed, since we updated local state
      return { success: true, data: result.data || [] }
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
      // Still update local state even if database update fails
      const activityNotificationIds = notifications
        .filter(n => !NotificationService.isValidUUID(n.id))
        .map(n => n.id)
      
      if (activityNotificationIds.length > 0) {
        NotificationService.markAllActivityNotificationsRead(user.id, activityNotificationIds)
      }
      
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
    if (!user?.id) return

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

    // Set up real-time subscription for database notifications
    const subscription = NotificationService.subscribeToNotifications(
      user.id,
      (payload) => {
        console.log('New notification received:', payload)
        
        if (payload?.new) {
          const notification = payload.new
          
          // Add new notification to the list
          setNotifications(prev => {
            // Check if notification already exists to avoid duplicates
            const exists = prev.some(n => n.id === notification.id)
            if (exists) return prev
            return [notification, ...prev]
          })
          // Update unread count
          setUnreadCount(prev => prev + 1)
          
          // Show browser push notification
          showBrowserNotification(notification)
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

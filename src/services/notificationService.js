import { supabase } from '../lib/supabase'

class NotificationService {
  // Get user notifications (includes both regular and admin activity notifications)
  static async getUserNotifications(userId, limit = 100, offset = 0) {
    try {
      // First, get regular notifications
      const { data: regularNotifications, error: regularError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (regularError) {
        console.error('Error fetching regular notifications:', regularError)
        return { success: false, error: regularError.message }
      }

      // Check if user is admin and fetch admin activity notifications from the new table
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', userId)
        .single()

      let adminActivityNotifications = []
      if (adminUser) {
        const { data: activityNotificationsData, error: activityError } = await supabase
          .from('admin_activity_notifications')
          .select('*')
          .eq('admin_user_id', userId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (activityError) {
          console.error('Error fetching admin activity notifications:', activityError)
          return { success: false, error: activityError.message }
        }
        adminActivityNotifications = activityNotificationsData.map(notif => ({
          id: notif.id,
          user_id: notif.admin_user_id,
          type: notif.activity_type,
          title: notif.title,
          message: notif.message,
          data: notif.data,
          read: notif.read,
          read_at: notif.read_at,
          created_at: notif.created_at
        }))
      }

      // Combine and sort all notifications by created_at
      const allNotifications = [...(regularNotifications || []), ...adminActivityNotifications]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit)

      return { success: true, data: allNotifications }
    } catch (error) {
      console.error('Error in getUserNotifications:', error)
      return { success: false, error: error.message }
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId) {
    try {
      if (!this.isValidUUID(notificationId)) {
        console.warn('Invalid notification ID format:', notificationId)
        return { success: false, error: 'Invalid notification ID' }
      }

      let tableName = 'notifications'
      let userIdColumn = 'user_id'
      let notification = null

      // Try to find in regular notifications first
      const { data: regularNotif, error: regularError } = await supabase
        .from('notifications')
        .select('id, type, data, user_id')
        .eq('id', notificationId)
        .single()

      if (regularError && regularError.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching regular notification:', regularError)
        return { success: false, error: regularError.message }
      } else if (regularNotif) {
        notification = regularNotif
      } else {
        // If not found in regular, try admin activity notifications
        const { data: activityNotif, error: activityError } = await supabase
          .from('admin_activity_notifications')
          .select('id, activity_type, data, admin_user_id')
          .eq('id', notificationId)
          .single()

        if (activityError && activityError.code !== 'PGRST116') {
          console.error('Error fetching admin activity notification:', activityError)
          return { success: false, error: activityError.message }
        } else if (activityNotif) {
          tableName = 'admin_activity_notifications'
          userIdColumn = 'admin_user_id'
          notification = {
            id: activityNotif.id,
            type: activityNotif.activity_type,
            data: activityNotif.data,
            user_id: activityNotif.admin_user_id // Map to user_id for consistency
          }
        }
      }

      if (!notification) {
        console.warn('Notification not found:', notificationId)
        return { success: false, error: 'Notification not found' }
      }

      const updateData = {
        read: true,
        read_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', notificationId)
        .select()
        .single()

      if (error) {
        console.error('Error marking notification as read:', error)
        return { success: false, error: error.message }
      }

      // If this is an announcement notification, track the view
      if (notification?.type === 'announcement' && notification?.data?.announcement_id && notification?.user_id) {
        try {
          const nowIso = new Date().toISOString()
          const { data: existingView } = await supabase
            .from('user_announcements')
            .select('id, is_read')
            .eq('announcement_id', notification.data.announcement_id)
            .eq('user_id', notification.user_id)
            .single()

          if (existingView) {
            if (!existingView.is_read) {
              await supabase
                .from('user_announcements')
                .update({
                  is_read: true,
                  read_at: nowIso,
                  updated_at: nowIso
                })
                .eq('id', existingView.id)
              console.log('✅ Updated announcement view record')
            }
          } else {
            await supabase
              .from('user_announcements')
              .insert({
                user_id: notification.user_id,
                announcement_id: notification.data.announcement_id,
                is_read: true,
                read_at: nowIso,
                created_at: nowIso,
                updated_at: nowIso
              })
            console.log('✅ Created announcement view record')
          }
        } catch (viewError) {
          console.warn('Error tracking announcement view:', viewError)
        }
      }

      return { success: true, data }
    } catch (error) {
      console.error('Error in markAsRead:', error)
      return { success: false, error: error.message }
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      const nowIso = new Date().toISOString()
      
      // Mark regular notifications as read
      const { data: regularData, error: regularError } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: nowIso
        })
        .eq('user_id', userId)
        .eq('read', false)
        .select()

      if (regularError) {
        console.error('Error marking all regular notifications as read:', regularError)
        // Don't return, try to mark admin notifications as well
      }

      // Mark admin activity notifications as read
      const { data: adminActivityData, error: adminActivityError } = await supabase
        .from('admin_activity_notifications')
        .update({
          read: true,
          read_at: nowIso
        })
        .eq('admin_user_id', userId)
        .eq('read', false)
        .select()

      if (adminActivityError) {
        console.error('Error marking all admin activity notifications as read:', adminActivityError)
        // Don't return, continue
      }

      const combinedData = [...(regularData || []), ...(adminActivityData || [])]
      return { success: true, data: combinedData }
    } catch (error) {
      console.error('Error in markAllAsRead:', error)
      return { success: false, error: error.message }
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId) {
    try {
      // Count regular notifications
      const { count: regularCount, error: regularError } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (regularError) {
        console.error('Error getting regular unread count:', regularError)
      }

      // Count admin activity notifications
      const { count: activityCount, error: activityError } = await supabase
        .from('admin_activity_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('admin_user_id', userId)
        .eq('read', false)

      if (activityError) {
        console.error('Error getting activity unread count:', activityError)
      }

      const totalCount = (regularCount || 0) + (activityCount || 0)

      return { success: true, count: totalCount }
    } catch (error) {
      console.error('Error in getUnreadCount:', error)
      return { success: false, error: error.message }
    }
  }

  // Check if a string is a valid UUID
  static isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  // Subscribe to real-time notifications (includes admin activities)
  static subscribeToNotifications(userId, callback) {
    console.log('🔔 Setting up real-time subscription for user:', userId)
    
    const channel = supabase
      .channel(`notifications:${userId}`)
      
    // Subscribe to regular notifications - INSERT events
    channel.on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, 
      (payload) => {
        console.log('🔔 Regular notification INSERT event:', payload)
        callback(payload)
      }
    )

    // Subscribe to regular notifications - UPDATE events (for read status changes)
    channel.on('postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🔔 Regular notification UPDATE event:', payload)
        callback(payload)
      }
    )

    // Subscribe to admin activity notifications - INSERT events
    // Note: Using a more permissive filter approach that works better with RLS
    channel.on('postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'admin_activity_notifications'
        // Removed filter - RLS will handle filtering, and we'll filter in callback
      },
      (payload) => {
        console.log('🔔 Admin activity notification INSERT event:', payload)
        if (payload?.new) {
          // Only process if this notification is for the current user
          if (payload.new.admin_user_id !== userId) {
            console.log('🔔 Notification not for current user, skipping')
            return
          }
          
          // Convert to notification format
          const notification = {
            id: payload.new.id,
            user_id: payload.new.admin_user_id,
            type: payload.new.activity_type,
            title: payload.new.title,
            message: payload.new.message,
            data: payload.new.data || {},
            read: payload.new.read,
            read_at: payload.new.read_at,
            created_at: payload.new.created_at
          }
          console.log('🔔 Converted admin notification:', notification)
          callback({ new: notification })
        }
      }
    )

    // Subscribe to admin activity notifications - UPDATE events (for read status changes)
    channel.on('postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'admin_activity_notifications'
        // Removed filter - RLS will handle filtering, and we'll filter in callback
      },
      (payload) => {
        console.log('🔔 Admin activity notification UPDATE event:', payload)
        if (payload?.new) {
          // Only process if this notification is for the current user
          if (payload.new.admin_user_id !== userId) {
            console.log('🔔 Update notification not for current user, skipping')
            return
          }
          
          // Convert to notification format
          const notification = {
            id: payload.new.id,
            user_id: payload.new.admin_user_id,
            type: payload.new.activity_type,
            title: payload.new.title,
            message: payload.new.message,
            data: payload.new.data || {},
            read: payload.new.read,
            read_at: payload.new.read_at,
            created_at: payload.new.created_at
          }
          callback({ 
            new: notification, 
            old: payload.old,
            eventType: payload.eventType || 'UPDATE'
          })
        }
      }
    )

    // Subscribe with status callbacks
    channel.subscribe((status) => {
      console.log('🔔 Subscription status:', status)
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to real-time notifications')
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error subscribing to real-time notifications')
      } else if (status === 'TIMED_OUT') {
        console.warn('⏱️ Subscription timed out')
      } else if (status === 'CLOSED') {
        console.log('🔒 Subscription closed')
      }
    })

    return {
      unsubscribe: () => {
        console.log('🔕 Unsubscribing from notifications')
        channel.unsubscribe()
      }
    }
  }
}

export default NotificationService

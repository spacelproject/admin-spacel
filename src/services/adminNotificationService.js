import { supabase } from '../lib/supabase'

/**
 * Service for creating admin activity notifications
 */
class AdminNotificationService {
  /**
   * Create admin activity notification for all admins
   * @param {string} activityType - Type of activity (e.g., 'deletion_request', 'city_request')
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {object} data - Additional data (request_id, action_url, etc.)
   */
  static async createAdminActivityNotification(activityType, title, message, data = {}) {
    try {
      // Get all active admin users
      const { data: adminUsers, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('is_active', true)
        .in('role', ['admin', 'super_admin'])

      if (adminError) {
        console.error('Error fetching admin users:', adminError)
        return { success: false, error: adminError.message }
      }

      if (!adminUsers || adminUsers.length === 0) {
        console.warn('No active admin users found')
        return { success: true, data: [] }
      }

      // Create notifications for all admins
      const notifications = adminUsers.map(admin => ({
        admin_user_id: admin.user_id,
        activity_type: activityType,
        title,
        message,
        data: {
          ...data,
          created_at: new Date().toISOString()
        },
        read: false,
        created_at: new Date().toISOString()
      }))

      const { data: createdNotifications, error: insertError } = await supabase
        .from('admin_activity_notifications')
        .insert(notifications)
        .select()

      if (insertError) {
        console.error('Error creating admin activity notifications:', insertError)
        return { success: false, error: insertError.message }
      }

      console.log(`✅ Created ${createdNotifications.length} admin activity notifications for ${activityType}`)
      return { success: true, data: createdNotifications }
    } catch (error) {
      console.error('Error in createAdminActivityNotification:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Notify admins about a new account deletion request
   * @param {string} requestId - Deletion request ID
   * @param {string} email - User email
   */
  static async notifyDeletionRequest(requestId, email) {
    return await this.createAdminActivityNotification(
      'deletion_request',
      'New Account Deletion Request',
      `A user has requested account deletion: ${email}`,
      {
        request_id: requestId,
        email: email,
        action_url: '/account-deletion-requests'
      }
    )
  }

  /**
   * Notify admins about a new city request
   * @param {string} requestId - City request ID
   * @param {string} email - User email
   * @param {string} city - Requested city name
   */
  static async notifyCityRequest(requestId, email, city) {
    return await this.createAdminActivityNotification(
      'city_request',
      'New City Request',
      `${email} has requested to add the city: ${city}`,
      {
        request_id: requestId,
        email: email,
        city: city,
        action_url: '/city-requests'
      }
    )
  }
}

export default AdminNotificationService


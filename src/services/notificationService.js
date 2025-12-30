import { supabase } from '../lib/supabase'

class NotificationService {
  // Send notification to a user
  static async sendNotification(userId, notificationData) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: notificationData.type,
          title: notificationData.title,
          message: notificationData.message,
          data: notificationData.data || {},
          read: false
        })
        .select()
        .single()

      if (error) {
        console.error('Error sending notification:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Notification sent successfully:', data)
      return { success: true, data }
    } catch (error) {
      console.error('Error in sendNotification:', error)
      return { success: false, error: error.message }
    }
  }

  // Send listing approval notification
  static async sendListingApprovalNotification(listingData, partnerId) {
    const notificationData = {
      type: 'listing_approval',
      title: '🎉 Listing Approved!',
      message: `Great news! Your listing "${listingData.name}" has been approved and is now live on the platform.`,
      data: {
        listing_id: listingData.id,
        listing_name: listingData.name,
        action_type: 'listing_approved',
        action_url: `/partner/listings/${listingData.id}`,
        approved_at: new Date().toISOString()
      }
    }

    return await this.sendNotification(partnerId, notificationData)
  }

  // Send listing rejection notification
  static async sendListingRejectionNotification(listingData, partnerId, rejectionReason) {
    const notificationData = {
      type: 'listing_rejection',
      title: '❌ Listing Not Approved',
      message: `Your listing "${listingData.name}" requires some changes before it can be approved. Please review the feedback and resubmit.`,
      data: {
        listing_id: listingData.id,
        listing_name: listingData.name,
        rejection_reason: rejectionReason,
        action_type: 'listing_rejected',
        action_url: `/partner/listings/${listingData.id}/edit`,
        rejected_at: new Date().toISOString()
      }
    }

    return await this.sendNotification(partnerId, notificationData)
  }

  // Send payout disabled notification
  static async sendPayoutDisabledNotification(partnerId, reason = null) {
    const notificationData = {
      type: 'payout_disabled',
      title: '⚠️ Payout Requests Disabled',
      message: reason 
        ? `Your payout requests have been disabled. Reason: ${reason}` 
        : 'Your payout requests have been disabled by an administrator. Please contact support for more information.',
      data: {
        action_type: 'payout_disabled',
        action_url: '/partner/payouts',
        disabled_at: new Date().toISOString(),
        reason: reason
      }
    }

    return await this.sendNotification(partnerId, notificationData)
  }

  // Send payout enabled notification
  static async sendPayoutEnabledNotification(partnerId) {
    const notificationData = {
      type: 'payout_enabled',
      title: '✅ Payout Requests Enabled',
      message: 'Your payout requests have been re-enabled. You can now request payouts again.',
      data: {
        action_type: 'payout_enabled',
        action_url: '/partner/payouts',
        enabled_at: new Date().toISOString()
      }
    }

    return await this.sendNotification(partnerId, notificationData)
  }

  // Get user notifications (includes admin activity notifications)
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
        console.error('Error fetching notifications:', regularError)
        return { success: false, error: regularError.message }
      }

      // Check if user is admin and fetch admin activity notifications
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select('role')
        .eq('user_id', userId)
        .single()

      let adminActivityNotifications = []
      
      if (adminUser) {
        // Fetch recent admin activities and convert them to notifications
        adminActivityNotifications = await this.getAdminActivityNotifications(userId, limit)
      }

      // Combine and sort all notifications by created_at
      // Remove duplicates based on id
      const notificationMap = new Map()
      
      // Add regular notifications
      if (regularNotifications) {
        regularNotifications.forEach(notif => {
          notificationMap.set(notif.id, notif)
        })
      }
      
      // Add admin activity notifications (will overwrite duplicates)
      adminActivityNotifications.forEach(notif => {
        notificationMap.set(notif.id, notif)
      })
      
      // Convert back to array, sort, and limit
      const allNotifications = Array.from(notificationMap.values())
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit)

      return { success: true, data: allNotifications }
    } catch (error) {
      console.error('Error in getUserNotifications:', error)
      return { success: false, error: error.message }
    }
  }

  // Get read activity notification IDs from localStorage
  static getReadActivityNotifications(userId) {
    try {
      const key = `read_activity_notifications_${userId}`
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error reading from localStorage:', error)
      return []
    }
  }

  // Save read activity notification ID to localStorage
  static saveReadActivityNotification(userId, notificationId) {
    try {
      const key = `read_activity_notifications_${userId}`
      const readIds = this.getReadActivityNotifications(userId)
      if (!readIds.includes(notificationId)) {
        readIds.push(notificationId)
        localStorage.setItem(key, JSON.stringify(readIds))
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }

  // Mark all activity notifications as read in localStorage
  static markAllActivityNotificationsRead(userId, notificationIds) {
    try {
      const key = `read_activity_notifications_${userId}`
      const readIds = this.getReadActivityNotifications(userId)
      notificationIds.forEach(id => {
        if (!readIds.includes(id)) {
          readIds.push(id)
        }
      })
      localStorage.setItem(key, JSON.stringify(readIds))
    } catch (error) {
      console.error('Error marking all activity notifications as read:', error)
    }
  }

  // Helper function to safely fetch data with error handling
  static async safeFetch(tableName, queryBuilder, fallback = []) {
    try {
      const { data, error } = await queryBuilder
      if (error) {
        console.warn(`⚠️ ${tableName} fetch skipped:`, error.message)
        return fallback
      }
      return data || fallback
    } catch (e) {
      console.warn(`⚠️ ${tableName} not available, skipping`)
      return fallback
    }
  }

  // Get admin activity notifications (converts activities to notification format)
  static async getAdminActivityNotifications(adminUserId, limit = 50) {
    try {
      const notifications = []
      // Fetch activities from last 30 days instead of just 24 hours
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      
      // Get read activity notification IDs from localStorage
      const readActivityIds = this.getReadActivityNotifications(adminUserId)
      
      console.log('🔔 Fetching admin activity notifications for user:', adminUserId)

      // Run all queries in parallel for faster loading
      const [
        bookingsResult,
        listingsResult,
        usersResult,
        ticketsResult,
        reportsResult,
        paymentsResult,
        approvedListingsResult,
        completedBookingsResult,
        bookingModsResult,
        suspendedListingsResult,
        refundsResult,
        userStatusHistoryResult,
        payoutRequestsResult
      ] = await Promise.all([
        // 1. Recent bookings (last 30 days) - including booking_reference
        this.safeFetch('bookings', supabase
          .from('bookings')
          .select(`
            id,
            booking_reference,
            status,
            payment_status,
            created_at,
            listings:listing_id (id, name),
            seekers:seeker_id (id, first_name, last_name, avatar_url)
          `)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(20)),
        
        // 2. Pending listings (all pending, no time limit) - including resubmissions
        this.safeFetch('listings', supabase
          .from('listings')
          .select(`
            id,
            name,
            status,
            created_at,
            updated_at,
            submitted_at,
            rejected_at,
            profiles:partner_id (id, first_name, last_name, avatar_url)
          `)
          .eq('status', 'pending')
          .order('updated_at', { ascending: false })
          .limit(20)),
        
        // 3. New user registrations (last 30 days)
        this.safeFetch('profiles', supabase
          .from('profiles')
          .select('id, first_name, last_name, role, created_at')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(20)),
        
        // 4. Open support tickets (all open, no time limit)
        this.safeFetch('support_tickets', supabase
          .from('support_tickets')
          .select(`
            id,
            ticket_id,
            subject,
            status,
            priority,
            created_at,
            profiles:user_id (id, first_name, last_name, avatar_url)
          `)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(20)),
        
        // 5. Content reports (all pending, no time limit)
        this.safeFetch('content_reports', supabase
          .from('content_reports')
          .select(`
            id,
            report_type,
            report_reason,
            status,
            priority,
            created_at
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(20)),
        
        // 6. Payment issues (failed payments and refunds - last 30 days)
        this.safeFetch('payment_logs', supabase
          .from('payment_logs')
          .select(`
            id,
            status,
            event_type,
            amount,
            currency,
            stripe_refund_id,
            created_at,
            bookings:booking_id (
              id, 
              booking_reference,
              listings:listing_id (id, name),
              seekers:seeker_id (id, first_name, last_name, avatar_url)
            )
          `)
          .or('status.eq.failed,status.eq.refunded,event_type.eq.refund.created')
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(20)),
        
        // 7. Recently approved listings (last 30 days)
        this.safeFetch('listings', supabase
          .from('listings')
          .select(`
            id,
            name,
            status,
            approved_at,
            created_at,
            profiles:partner_id (id, first_name, last_name, avatar_url)
          `)
          .eq('status', 'active')
          .not('approved_at', 'is', null)
          .gte('approved_at', thirtyDaysAgo.toISOString())
          .order('approved_at', { ascending: false })
          .limit(15)),
        
        // 8. Completed bookings (last 30 days)
        this.safeFetch('bookings', supabase
          .from('bookings')
          .select(`
            id,
            booking_reference,
            status,
            completed_at,
            created_at,
            listings:listing_id (id, name),
            seekers:seeker_id (id, first_name, last_name, avatar_url)
          `)
          .eq('status', 'completed')
          .not('completed_at', 'is', null)
          .gte('completed_at', thirtyDaysAgo.toISOString())
          .order('completed_at', { ascending: false })
          .limit(15)),

        // 9. Booking modifications (including refunds)
        this.safeFetch('booking_modifications', supabase
          .from('booking_modifications')
          .select(`
            id,
            booking_id,
            modification_type,
            reason,
            description,
            created_at,
            bookings:booking_id (
              id, 
              booking_reference,
              listings:listing_id (id, name),
              seekers:seeker_id (id, first_name, last_name, avatar_url)
            )
          `)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(20)),

        // 10. Suspended listings (all suspended, no time limit)
        this.safeFetch('listings', supabase
          .from('listings')
          .select(`
            id,
            name,
            status,
            suspended_at,
            suspension_reason,
            created_at,
            profiles:partner_id (id, first_name, last_name, avatar_url)
          `)
          .eq('status', 'suspended')
          .not('suspended_at', 'is', null)
          .order('suspended_at', { ascending: false })
          .limit(20)),

        // 11. Refunds from bookings table
        this.safeFetch('bookings', supabase
          .from('bookings')
          .select(`
            id,
            booking_reference,
            payment_status,
            refund_amount,
            transfer_reversal_amount,
            stripe_refund_id,
            updated_at,
            listings:listing_id (id, name),
            seekers:seeker_id (id, first_name, last_name, avatar_url)
          `)
          .eq('payment_status', 'refunded')
          .gte('updated_at', thirtyDaysAgo.toISOString())
          .order('updated_at', { ascending: false })
          .limit(20)),

        // 12. User status changes (suspensions/reinstatements)
        this.safeFetch('user_status_history', supabase
          .from('user_status_history')
          .select(`
            id,
            user_id,
            old_status,
            new_status,
            reason,
            created_at,
            profiles!user_status_history_user_id_fkey (id, first_name, last_name, avatar_url)
          `)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(20)),

        // 13. Payout requests
        this.safeFetch('payout_requests', supabase
          .from('payout_requests')
          .select(`
            id,
            partner_id,
            partner_name,
            amount,
            status,
            requested_at,
            updated_at,
            profiles:partner_id (id, first_name, last_name, avatar_url)
          `)
          .gte('requested_at', thirtyDaysAgo.toISOString())
          .order('requested_at', { ascending: false })
          .limit(20))
      ])

      // Extract data from parallel queries (results are already arrays from safeFetch)
      const newBookings = bookingsResult || []
      const pendingListings = listingsResult || []
      const newUsers = usersResult || []
      const newTickets = ticketsResult || []
      const contentReports = reportsResult || []
      const failedPayments = paymentsResult || []
      const approvedListings = approvedListingsResult || []
      const completedBookings = completedBookingsResult || []
      const bookingMods = bookingModsResult || []
      const suspendedListings = suspendedListingsResult || []
      const refunds = refundsResult || []
      const userStatusChanges = userStatusHistoryResult || []
      const payoutRequests = payoutRequestsResult || []

      // Helper function to check if notification is read
      const isRead = (notificationId) => readActivityIds.includes(notificationId)

      // 1. Recent bookings (including booking_reference)
      if (newBookings.length > 0) {
        console.log(`📅 Found ${newBookings.length} recent bookings`)
        newBookings.forEach(booking => {
          const notificationId = `booking_${booking.id}_${booking.created_at}`
          const seekerName = booking.seekers 
            ? `${booking.seekers.first_name || ''} ${booking.seekers.last_name || ''}`.trim() || 'User'
            : 'User'
          const spaceName = booking.listings?.name || 'Space'
          const bookingRef = booking.booking_reference || booking.id
          
          notifications.push({
            id: notificationId,
            user_id: adminUserId,
            type: 'booking',
            title: 'New Booking',
            message: `${seekerName} booked "${spaceName}"${bookingRef ? ` (${bookingRef})` : ''}`,
            data: {
              booking_id: booking.id,
              booking_reference: bookingRef,
              listing_id: booking.listings?.id,
              action_url: `/booking-management?booking=${booking.id}`,
              status: booking.status,
              payment_status: booking.payment_status
            },
            read: isRead(notificationId),
            created_at: booking.created_at
          })
        })
      }

      // 2. Pending listings
      if (pendingListings.length > 0) {
        console.log(`🏢 Found ${pendingListings.length} pending listings`)
        pendingListings.forEach(listing => {
          const isResubmission = listing.rejected_at !== null && listing.rejected_at !== undefined
          const notificationId = isResubmission 
            ? `listing_resubmitted_${listing.id}_${listing.updated_at}` 
            : `listing_pending_${listing.id}`
          const partnerName = listing.profiles
            ? `${listing.profiles.first_name || ''} ${listing.profiles.last_name || ''}`.trim() || 'Partner'
            : 'Partner'
          
          notifications.push({
            id: notificationId,
            user_id: adminUserId,
            type: isResubmission ? 'listing_resubmitted' : 'listing_approval',
            title: isResubmission ? 'Listing Resubmitted for Review' : 'Listing Pending Approval',
            message: isResubmission 
              ? `"${listing.name}" by ${partnerName} has been resubmitted for review`
              : `"${listing.name}" by ${partnerName} needs review`,
            data: {
              listing_id: listing.id,
              listing_name: listing.name,
              action_url: `/space-management?listing=${listing.id}`,
              status: 'pending',
              is_resubmission: isResubmission,
              rejected_at: listing.rejected_at
            },
            read: isRead(notificationId),
            created_at: isResubmission ? listing.updated_at : listing.created_at
          })
        })
      }

      // 3. New user registrations
      if (newUsers.length > 0) {
        console.log(`👤 Found ${newUsers.length} new user registrations`)
        newUsers.forEach(user => {
          const notificationId = `user_reg_${user.id}`
          const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'
          
          notifications.push({
            id: notificationId,
            user_id: adminUserId,
            type: 'system',
            title: 'New User Registration',
            message: `${userName} registered as ${user.role || 'user'}`,
            data: {
              user_id: user.id,
              action_url: `/user-management?user=${user.id}`,
              role: user.role
            },
            read: isRead(notificationId),
            created_at: user.created_at
          })
        })
      }

      // 4. Open support tickets
      if (newTickets.length > 0) {
        console.log(`🎫 Found ${newTickets.length} open support tickets`)
        newTickets.forEach(ticket => {
          const notificationId = `ticket_${ticket.id}`
          const userName = ticket.profiles
            ? `${ticket.profiles.first_name || ''} ${ticket.profiles.last_name || ''}`.trim() || 'User'
            : 'User'
          
          notifications.push({
            id: notificationId,
            user_id: adminUserId,
            type: 'system',
            title: `New Support Ticket${ticket.priority === 'high' ? ' (High Priority)' : ''}`,
            message: `${userName}: ${ticket.subject}`,
            data: {
              ticket_id: ticket.id,
              action_url: `/support-ticket-system?ticket=${ticket.id}`,
              priority: ticket.priority,
              status: ticket.status
            },
            read: isRead(notificationId),
            created_at: ticket.created_at
          })
        })
      }

      // 5. Content reports
      if (contentReports.length > 0) {
        console.log(`📋 Found ${contentReports.length} pending content reports`)
        contentReports.forEach(report => {
          const notificationId = `report_${report.id}`
          notifications.push({
            id: notificationId,
            user_id: adminUserId,
            type: 'system',
            title: `Content Report${report.priority === 'urgent' ? ' (Urgent)' : ''}`,
            message: `New ${report.report_type} report: ${report.report_reason}`,
            data: {
              report_id: report.id,
              action_url: `/content-management?tab=moderation&report=${report.id}`,
              priority: report.priority,
              report_type: report.report_type
            },
            read: isRead(notificationId),
            created_at: report.created_at
          })
        })
      }

      // 6. Payment issues (failed payments and refunds)
      if (failedPayments.length > 0) {
        console.log(`💳 Found ${failedPayments.length} payment issues`)
        failedPayments.forEach(payment => {
          const isRefund = payment.status === 'refunded' || payment.event_type === 'refund.created'
          const isFailed = payment.status === 'failed'
          
          if (isRefund) {
            // Handle refund notifications separately (they're also in refunds array)
            // Skip here to avoid duplicates
            return
          }
          
          if (isFailed) {
            const notificationId = `payment_failed_${payment.id}_${payment.created_at}`
            const spaceName = payment.bookings?.listings?.name || 'Unknown Space'
            const bookingRef = payment.bookings?.booking_reference || payment.bookings?.id
            
            notifications.push({
              id: notificationId,
              user_id: adminUserId,
              type: 'system',
              title: 'Payment Failed',
              message: `Payment of ${payment.currency} ${Math.abs(parseFloat(payment.amount || 0)).toFixed(2)} failed for "${spaceName}"${bookingRef ? ` (${bookingRef})` : ''}`,
              data: {
                payment_id: payment.id,
                booking_id: payment.bookings?.id,
                booking_reference: bookingRef,
                action_url: `/booking-management?payment=${payment.id}`,
                amount: payment.amount,
                currency: payment.currency
              },
              read: isRead(notificationId),
              created_at: payment.created_at
            })
          }
        })
      }

      // 7. Recently approved listings
      if (approvedListings.length > 0) {
        console.log(`✅ Found ${approvedListings.length} recently approved listings`)
        approvedListings.forEach(listing => {
          const notificationId = `listing_approved_${listing.id}`
          const partnerName = listing.profiles
            ? `${listing.profiles.first_name || ''} ${listing.profiles.last_name || ''}`.trim() || 'Partner'
            : 'Partner'
          
          notifications.push({
            id: notificationId,
            user_id: adminUserId,
            type: 'listing_approval',
            title: 'Listing Approved',
            message: `"${listing.name}" by ${partnerName} was approved`,
            data: {
              listing_id: listing.id,
              action_url: `/space-management?listing=${listing.id}`,
              status: 'active'
            },
            read: isRead(notificationId),
            created_at: listing.approved_at || listing.created_at
          })
        })
      }

      // 8. Completed bookings
      if (completedBookings.length > 0) {
        console.log(`🎉 Found ${completedBookings.length} completed bookings`)
        completedBookings.forEach(booking => {
          const notificationId = `booking_completed_${booking.id}_${booking.completed_at || booking.created_at}`
          const seekerName = booking.seekers 
            ? `${booking.seekers.first_name || ''} ${booking.seekers.last_name || ''}`.trim() || 'User'
            : 'User'
          const spaceName = booking.listings?.name || 'Space'
          const bookingRef = booking.booking_reference || booking.id
          
          notifications.push({
            id: notificationId,
            user_id: adminUserId,
            type: 'booking',
            title: 'Booking Completed',
            message: `${seekerName} completed booking for "${spaceName}"${bookingRef ? ` (${bookingRef})` : ''}`,
            data: {
              booking_id: booking.id,
              booking_reference: bookingRef,
              listing_id: booking.listings?.id,
              action_url: `/booking-management?booking=${booking.id}`,
              status: 'completed'
            },
            read: isRead(notificationId),
            created_at: booking.completed_at || booking.created_at
          })
        })
      }

      // 9. Booking modifications (refunds, status changes, etc.)
      if (bookingMods.length > 0) {
        console.log(`📝 Found ${bookingMods.length} booking modifications`)
        bookingMods.forEach(mod => {
          if (mod.modification_type === 'refund') {
            const notificationId = `booking_refund_${mod.booking_id}_${mod.created_at}`
            const bookingRef = mod.bookings?.booking_reference || mod.booking_id
            const spaceName = mod.bookings?.listings?.name || 'Space'
            const seekerName = mod.bookings?.seekers
              ? `${mod.bookings.seekers.first_name || ''} ${mod.bookings.seekers.last_name || ''}`.trim() || 'User'
              : 'User'
            
            notifications.push({
              id: notificationId,
              user_id: adminUserId,
              type: 'refund',
              title: 'Booking Refunded',
              message: `Refund processed for "${spaceName}" booking${bookingRef ? ` (${bookingRef})` : ''} by ${seekerName}`,
              data: {
                booking_id: mod.booking_id,
                booking_reference: bookingRef,
                modification_id: mod.id,
                reason: mod.reason,
                action_url: `/booking-management?booking=${mod.booking_id}`,
                modification_type: mod.modification_type
              },
              read: isRead(notificationId),
              created_at: mod.created_at
            })
          }
        })
      }

      // 10. Suspended listings
      if (suspendedListings.length > 0) {
        console.log(`🚫 Found ${suspendedListings.length} suspended listings`)
        suspendedListings.forEach(listing => {
          const notificationId = `listing_suspended_${listing.id}_${listing.suspended_at}`
          const partnerName = listing.profiles
            ? `${listing.profiles.first_name || ''} ${listing.profiles.last_name || ''}`.trim() || 'Partner'
            : 'Partner'
          
          notifications.push({
            id: notificationId,
            user_id: adminUserId,
            type: 'listing_suspension',
            title: 'Listing Suspended',
            message: `"${listing.name}" by ${partnerName} was suspended${listing.suspension_reason ? `: ${listing.suspension_reason}` : ''}`,
            data: {
              listing_id: listing.id,
              action_url: `/space-management?listing=${listing.id}`,
              status: 'suspended',
              suspension_reason: listing.suspension_reason
            },
            read: isRead(notificationId),
            created_at: listing.suspended_at || listing.created_at
          })
        })
      }

      // 11. Refunds from bookings
      if (refunds.length > 0) {
        console.log(`💰 Found ${refunds.length} refunded bookings`)
        refunds.forEach(booking => {
          const notificationId = `refund_${booking.id}_${booking.updated_at}`
          const bookingRef = booking.booking_reference || booking.id
          const spaceName = booking.listings?.name || 'Space'
          const seekerName = booking.seekers
            ? `${booking.seekers.first_name || ''} ${booking.seekers.last_name || ''}`.trim() || 'User'
            : 'User'
          const is50_50 = booking.transfer_reversal_amount && parseFloat(booking.transfer_reversal_amount) > 0
          const refundAmount = parseFloat(booking.refund_amount || 0)
          const partnerRefund = parseFloat(booking.transfer_reversal_amount || 0)
          const totalRefund = is50_50 ? refundAmount + partnerRefund : refundAmount
          
          notifications.push({
            id: notificationId,
            user_id: adminUserId,
            type: 'refund',
            title: is50_50 ? '50/50 Split Refund' : 'Booking Refunded',
            message: `${is50_50 ? '50/50 split refund' : 'Refund'} of A$${totalRefund.toFixed(2)} for "${spaceName}"${bookingRef ? ` (${bookingRef})` : ''}`,
            data: {
              booking_id: booking.id,
              booking_reference: bookingRef,
              refund_amount: refundAmount,
              transfer_reversal_amount: partnerRefund,
              total_refund: totalRefund,
              is_50_50_split: is50_50,
              stripe_refund_id: booking.stripe_refund_id,
              action_url: `/booking-management?booking=${booking.id}`,
              payment_status: 'refunded'
            },
            read: isRead(notificationId),
            created_at: booking.updated_at
          })
        })
      }

      // 12. User status changes (suspensions/reinstatements)
      if (userStatusChanges.length > 0) {
        console.log(`👤 Found ${userStatusChanges.length} user status changes`)
        userStatusChanges.forEach(change => {
          const notificationId = `user_status_${change.user_id}_${change.created_at}`
          const userName = change.profiles
            ? `${change.profiles.first_name || ''} ${change.profiles.last_name || ''}`.trim() || 'User'
            : 'User'
          const isSuspension = change.new_status === 'suspended'
          const isReinstatement = change.old_status === 'suspended' && change.new_status === 'active'
          
          notifications.push({
            id: notificationId,
            user_id: adminUserId,
            type: 'user_status_change',
            title: isSuspension ? 'User Suspended' : isReinstatement ? 'User Reinstated' : 'User Status Changed',
            message: `${userName} status changed from ${change.old_status || 'unknown'} to ${change.new_status}${change.reason ? `: ${change.reason}` : ''}`,
            data: {
              user_id: change.user_id,
              old_status: change.old_status,
              new_status: change.new_status,
              reason: change.reason,
              action_url: `/user-management?user=${change.user_id}`
            },
            read: isRead(notificationId),
            created_at: change.created_at
          })
        })
      }

      // 13. Payout requests
      if (payoutRequests.length > 0) {
        console.log(`💵 Found ${payoutRequests.length} payout requests`)
        payoutRequests.forEach(payout => {
          const notificationId = `payout_${payout.id}_${payout.requested_at}`
          const partnerName = payout.profiles
            ? `${payout.profiles.first_name || ''} ${payout.profiles.last_name || ''}`.trim() || payout.partner_name || 'Partner'
            : payout.partner_name || 'Partner'
          
          notifications.push({
            id: notificationId,
            user_id: adminUserId,
            type: 'payout_request',
            title: `Payout Request${payout.status === 'pending' ? ' (Pending)' : ''}`,
            message: `${partnerName} requested payout of A$${parseFloat(payout.amount || 0).toFixed(2)}`,
            data: {
              payout_id: payout.id,
              partner_id: payout.partner_id,
              amount: payout.amount,
              status: payout.status,
              action_url: `/commission-management?payout=${payout.id}`
            },
            read: isRead(notificationId),
            created_at: payout.requested_at
          })
        })
      }

      // Sort notifications by created_at (most recent first)
      notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      console.log(`🔔 Total admin activity notifications created: ${notifications.length}`)
      return notifications.slice(0, limit) // Return limited results
    } catch (error) {
      console.error('Error fetching admin activity notifications:', error)
      return []
    }
  }

  // Check if a string is a valid UUID
  static isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
  }

  // Mark notification as read
  static async markAsRead(notificationId) {
    try {
      // Check if this is a real notification ID (UUID) or an activity notification (generated ID)
      if (!this.isValidUUID(notificationId)) {
        // This is an activity notification (e.g., "booking_123", "user_reg_456")
        // Save to localStorage to persist read state
        const userId = (await supabase.auth.getUser()).data?.user?.id
        if (userId) {
          this.saveReadActivityNotification(userId, notificationId)
        }
        return { success: true, data: { id: notificationId, read: true } }
      }

      // This is a real notification from the database
      // First, get the notification to check if it's an announcement
      const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select('id, type, data, user_id')
        .eq('id', notificationId)
        .single()

      if (fetchError) {
        console.error('Error fetching notification:', fetchError)
        return { success: false, error: fetchError.message }
      }

      // Update notification as read
      const { data, error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
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
          
          // Check if view already exists
          const { data: existingView } = await supabase
            .from('user_announcements')
            .select('id, is_read')
            .eq('announcement_id', notification.data.announcement_id)
            .eq('user_id', notification.user_id)
            .single()

          if (existingView) {
            // Update existing record if not already read
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
            // Create new view record
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
          // Don't fail the notification read if view tracking fails
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
      // Only mark real notifications (from database) as read
      // Activity notifications will be handled in local state
      const { data, error } = await supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false)
        .select()

      if (error) {
        console.error('Error marking all notifications as read:', error)
        return { success: false, error: error.message }
      }

      return { success: true, data: data || [] }
    } catch (error) {
      console.error('Error in markAllAsRead:', error)
      return { success: false, error: error.message }
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId) {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)

      if (error) {
        console.error('Error getting unread count:', error)
        return { success: false, error: error.message }
      }

      return { success: true, count: count || 0 }
    } catch (error) {
      console.error('Error in getUnreadCount:', error)
      return { success: false, error: error.message }
    }
  }

  // Subscribe to real-time notifications (includes admin activities)
  static subscribeToNotifications(userId, callback) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      
    // Subscribe to regular notifications
    channel.on('postgres_changes', 
      { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, 
      callback
    )

    // Subscribe to admin activities (bookings, listings, tickets, etc.)
    // Check if user is admin
    supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', userId)
      .single()
      .then(({ data: adminUser }) => {
        if (adminUser) {
          // Subscribe to bookings
          channel.on('postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'bookings'
            },
            async (payload) => {
              // Create notification for new booking
              const notification = await this.createBookingNotification(payload.new, userId)
              if (notification) callback({ new: notification })
            }
          )

          // Subscribe to pending listings
          channel.on('postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'listings',
              filter: 'status=eq.pending'
            },
            async (payload) => {
              const notification = await this.createListingNotification(payload.new, userId)
              if (notification) callback({ new: notification })
            }
          )

          // Subscribe to support tickets
          channel.on('postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'support_tickets',
              filter: 'status=eq.open'
            },
            async (payload) => {
              const notification = await this.createTicketNotification(payload.new, userId)
              if (notification) callback({ new: notification })
            }
          )

          // Subscribe to content reports
          channel.on('postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'content_reports',
              filter: 'status=eq.pending'
            },
            async (payload) => {
              const notification = await this.createReportNotification(payload.new, userId)
              if (notification) callback({ new: notification })
            }
          )
        }
      })

    channel.subscribe()

    return {
      unsubscribe: () => {
        channel.unsubscribe()
      }
    }
  }

  // Helper methods to create activity notifications
  static async createBookingNotification(booking, adminUserId) {
    try {
      const { data: listing } = await supabase
        .from('listings')
        .select('name')
        .eq('id', booking.listing_id)
        .single()

      const { data: seeker } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', booking.seeker_id)
        .single()

      const seekerName = seeker 
        ? `${seeker.first_name || ''} ${seeker.last_name || ''}`.trim() || 'User'
        : 'User'
      const spaceName = listing?.name || 'Space'

      return {
        id: `booking_${booking.id}`,
        user_id: adminUserId,
        type: 'booking',
        title: 'New Booking',
        message: `${seekerName} booked "${spaceName}"`,
        data: {
          booking_id: booking.id,
          listing_id: booking.listing_id,
          action_url: `/booking-management?booking=${booking.id}`,
          status: booking.status
        },
        read: false,
        created_at: booking.created_at || new Date().toISOString()
      }
    } catch (error) {
      console.error('Error creating booking notification:', error)
      return null
    }
  }

  static async createListingNotification(listing, adminUserId) {
    try {
      const { data: partner } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', listing.partner_id)
        .single()

      const partnerName = partner
        ? `${partner.first_name || ''} ${partner.last_name || ''}`.trim() || 'Partner'
        : 'Partner'

      return {
        id: `listing_pending_${listing.id}`,
        user_id: adminUserId,
        type: 'listing_approval',
        title: 'Listing Pending Approval',
        message: `"${listing.name}" by ${partnerName} needs review`,
        data: {
          listing_id: listing.id,
          action_url: `/space-management?listing=${listing.id}`,
          status: 'pending'
        },
        read: false,
        created_at: listing.created_at || new Date().toISOString()
      }
    } catch (error) {
      console.error('Error creating listing notification:', error)
      return null
    }
  }

  static async createTicketNotification(ticket, adminUserId) {
    try {
      const { data: user } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', ticket.user_id)
        .single()

      const userName = user
        ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User'
        : 'User'

      return {
        id: `ticket_${ticket.id}`,
        user_id: adminUserId,
        type: 'system',
        title: `New Support Ticket${ticket.priority === 'high' ? ' (High Priority)' : ''}`,
        message: `${userName}: ${ticket.subject}`,
        data: {
          ticket_id: ticket.id,
          action_url: `/support-ticket-system?ticket=${ticket.id}`,
          priority: ticket.priority,
          status: ticket.status
        },
        read: false,
        created_at: ticket.created_at || new Date().toISOString()
      }
    } catch (error) {
      console.error('Error creating ticket notification:', error)
      return null
    }
  }

  static async createReportNotification(report, adminUserId) {
    return {
      id: `report_${report.id}`,
      user_id: adminUserId,
      type: 'system',
      title: `Content Report${report.priority === 'urgent' ? ' (Urgent)' : ''}`,
      message: `New ${report.report_type} report: ${report.report_reason}`,
      data: {
        report_id: report.id,
        action_url: `/content-management?tab=moderation&report=${report.id}`,
        priority: report.priority,
        report_type: report.report_type
      },
      read: false,
      created_at: report.created_at || new Date().toISOString()
    }
  }
}

export default NotificationService

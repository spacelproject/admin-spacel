import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

// Helper to safely fetch data and handle errors
const safeFetch = async (tableName, queryBuilder, fallback = []) => {
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

export const useActivityFeed = () => {
  const [allActivities, setAllActivities] = useState([])
  const [displayedActivities, setDisplayedActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [displayCount, setDisplayCount] = useState(4) // Show 4 at a time
  const increment = 4 // Load 4 more each time
  const { user, isAdmin, loading: authLoading } = useAuth()

  const fetchAllActivities = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('✅ Fetching all activities...')
      const startTime = performance.now()

      // Execute all queries in parallel using Promise.all()
      const [
        usersData,
        bookingsData,
        listingsData,
        reviewsData,
        paymentLogs,
        ticketsData,
        bookingMods,
        conversations,
        favorites,
        announcements,
        moderationActions,
        payoutRequests,
        userStatusHistory,
        platformSettingsHistory,
        messages,
        contentReports,
        contentModeration,
        userNotes,
        adminUsers,
        partnerBanking,
        earnings,
        reviewRequests,
        documentation,
        legalPages,
        inviteTokens,
        payoutStatusChanges
      ] = await Promise.all([
        // 1. USER REGISTRATIONS
        safeFetch('profiles', supabase
        .from('profiles')
        .select('id, first_name, last_name, role, avatar_url, created_at, updated_at')
        .order('created_at', { ascending: false })
          .limit(100)),

        // 2. BOOKINGS
        safeFetch('bookings', supabase
        .from('bookings')
        .select(`
          id,
          status,
          payment_status,
          total_paid,
          created_at,
          updated_at,
          listings:listing_id (id, name),
          seekers:seeker_id (id, first_name, last_name, avatar_url)
        `)
        .order('updated_at', { ascending: false })
          .limit(100)),

        // 3. LISTINGS/SPACES
        safeFetch('listings', supabase
          .from('listings')
          .select(`
            id,
            name,
            status,
            created_at,
            updated_at,
            partner_id,
            rejected_at,
            profiles:partner_id (id, first_name, last_name, avatar_url)
          `)
          .order('updated_at', { ascending: false })
          .limit(100)),

        // 4. REVIEWS
        safeFetch('reviews', supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            seeker_id,
            profiles:seeker_id (id, first_name, last_name, avatar_url),
            listings:listing_id (id, name)
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 5. PAYMENT LOGS
        safeFetch('payment_logs', supabase
          .from('payment_logs')
          .select(`
            id,
            amount,
            status,
            transaction_id,
            created_at,
            preprocessing_id,
            bookings:booking_id (id, listings:listing_id (id, name))
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 6. SUPPORT TICKETS
        safeFetch('support_tickets', supabase
          .from('support_tickets')
          .select(`
            id,
            ticket_id,
            subject,
            status,
            priority,
            created_at,
            updated_at,
            profiles:user_id (id, first_name, last_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 7. BOOKING MODIFICATIONS
        safeFetch('booking_modifications', supabase
          .from('booking_modifications')
          .select(`
            id,
            booking_id,
            modification_type,
            created_at,
            bookings:booking_id (id, listings:listing_id (id, name))
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 8. CONVERSATIONS
        safeFetch('conversations', supabase
          .from('conversations')
          .select(`
            id,
            created_at,
            participant1_id,
            participant2_id
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 9. FAVORITES
        safeFetch('favorites', supabase
          .from('favorites')
          .select(`
            id,
            created_at,
            user_id,
            listing_id,
            profiles:user_id (id, first_name, last_name, avatar_url),
            listings:listing_id (id, name)
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 10. ANNOUNCEMENTS
        safeFetch('announcements', supabase
          .from('announcements')
          .select('id, title, status, publish_date, created_at, created_by')
          .eq('status', 'published')
          .order('publish_date', { ascending: false })
          .limit(100)),

        // 11. MODERATION ACTIONS
        safeFetch('moderation_actions', supabase
          .from('moderation_actions')
          .select(`
            id,
            action,
            target_type,
            target_id,
            reason,
            created_at,
            profiles:moderator_id (id, first_name, last_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 12. PAYOUT REQUESTS
        safeFetch('payout_requests', supabase
          .from('payout_requests')
          .select(`
            id,
            partner_id,
            partner_name,
            amount,
            status,
            requested_at,
            processed_at,
            updated_at,
            profiles:partner_id (id, first_name, last_name, avatar_url)
          `)
          .order('updated_at', { ascending: false })
          .limit(100)),

        // 13. USER STATUS CHANGES (Suspensions, Reinstatements)
        safeFetch('user_status_history', supabase
          .from('user_status_history')
          .select(`
            id,
            user_id,
            old_status,
            new_status,
            reason,
            created_at,
            profiles!user_status_history_user_id_fkey (id, first_name, last_name, avatar_url),
            changed_by_profile:profiles!user_status_history_changed_by_fkey (id, first_name, last_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 14. PLATFORM SETTINGS CHANGES
        safeFetch('platform_settings_history', supabase
          .from('platform_settings_history')
          .select(`
            id,
            setting_key,
            category,
            old_value,
            new_value,
            changed_by_name,
            changed_by_email,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 15. MESSAGES (Important messages only - first message in conversations)
        safeFetch('messages', supabase
          .from('messages')
          .select(`
            id,
            conversation_id,
            sender_id,
            content,
            created_at,
            profiles:sender_id (id, first_name, last_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 16. CONTENT REPORTS
        safeFetch('content_reports', supabase
          .from('content_reports')
          .select(`
            id,
            report_type,
            reported_item_type,
            status,
            priority,
            created_at,
            updated_at,
            profiles:reporter_id (id, first_name, last_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 17. CONTENT MODERATION ACTIONS
        safeFetch('content_moderation', supabase
          .from('content_moderation')
          .select(`
            id,
            action_type,
            action_reason,
            affected_content_type,
            created_at,
            profiles:moderator_id (id, first_name, last_name, avatar_url),
            affected_user_profile:profiles!content_moderation_affected_user_id_fkey (id, first_name, last_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 18. USER NOTES (Admin actions)
        safeFetch('user_notes', supabase
          .from('user_notes')
          .select(`
            id,
            user_id,
            note,
            is_internal,
            created_at,
            profiles!user_notes_user_id_fkey (id, first_name, last_name, avatar_url),
            created_by_profile:profiles!user_notes_created_by_fkey (id, first_name, last_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 19. ADMIN USER CREATION
        safeFetch('admin_users', supabase
          .from('admin_users')
          .select(`
            id,
            user_id,
            email,
            role,
            is_active,
            created_at,
            profiles:user_id (id, first_name, last_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 20. PARTNER BANKING UPDATES
        safeFetch('partner_banking', supabase
          .from('partner_banking')
          .select(`
            id,
            partner_id,
            is_verified,
            verified_at,
            updated_at,
            profiles:partner_id (id, first_name, last_name, avatar_url)
          `)
          .order('updated_at', { ascending: false })
          .limit(100)),

        // 21. EARNINGS
        safeFetch('earnings', supabase
          .from('earnings')
          .select(`
            id,
            partner_id,
            gross_amount,
            net_amount,
            status,
            created_at,
            profiles:partner_id (id, first_name, last_name, avatar_url)
          `)
          .order('created_at', { ascending: false })
          .limit(100)),

        // 22. REVIEW REQUESTS
        safeFetch('review_requests', supabase
          .from('review_requests')
          .select(`
            id,
            seeker_id,
            listing_id,
            status,
            requested_at,
            profiles:seeker_id (id, first_name, last_name, avatar_url),
            listings:listing_id (id, name)
          `)
          .order('requested_at', { ascending: false })
          .limit(100)),

        // 24. DOCUMENTATION PUBLISHED
        safeFetch('documentation', supabase
          .from('documentation')
          .select(`
            id,
            title,
            status,
            published_at,
            created_at,
            profiles:author_id (id, first_name, last_name, avatar_url)
          `)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(100)),

        // 25. LEGAL PAGES PUBLISHED
        safeFetch('legal_pages', supabase
          .from('legal_pages')
          .select(`
            id,
            title,
            status,
            page_type,
            published_at,
            created_at,
            profiles:author_id (id, first_name, last_name, avatar_url)
          `)
          .eq('status', 'published')
          .order('published_at', { ascending: false })
          .limit(100)),

        // 26. INVITE TOKENS USED
        safeFetch('invite_tokens', supabase
          .from('invite_tokens')
          .select(`
            id,
            email,
            role,
            used,
            used_at,
            invited_by,
            used_by,
            profiles!invite_tokens_invited_by_fkey (id, first_name, last_name, avatar_url),
            used_by_profile:profiles!invite_tokens_used_by_fkey (id, first_name, last_name, avatar_url)
          `)
          .eq('used', true)
          .order('used_at', { ascending: false })
          .limit(100)),

        // 27. PAYOUT STATUS CHANGES (from profiles table - payout_disabled changes)
        safeFetch('profiles_payout', supabase
          .from('profiles')
          .select(`
            id,
            first_name,
            last_name,
            avatar_url,
            payout_disabled,
            payout_disabled_at,
            payout_disabled_by,
            payout_disabled_reason,
            updated_at
          `)
          .not('payout_disabled_at', 'is', null)
          .order('payout_disabled_at', { ascending: false })
          .limit(100))
      ])

      const queryTime = performance.now() - startTime
      console.log(`⚡ All queries completed in ${queryTime.toFixed(2)}ms`)

      const activitiesList = []

      // Process USER REGISTRATIONS
      usersData.forEach(user => {
        activitiesList.push({
          id: `user_reg_${user.id}`,
          type: 'user_registration',
          title: 'New User Registration',
          description: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User' + ` registered as ${user.role || 'user'}`,
          avatar: user.avatar_url || '/assets/images/no_image.png',
          timestamp: user.created_at,
          priority: 'normal',
          raw: user
        })
      })

      // Process BOOKINGS
      bookingsData.forEach(booking => {
        const statusMessages = {
          pending: 'New Booking Request',
          confirmed: 'Booking Confirmed',
          cancelled: 'Booking Cancelled',
          completed: 'Booking Completed',
          rejected: 'Booking Rejected'
        }
        
        activitiesList.push({
          id: `booking_${booking.id}_${booking.updated_at}`,
          type: `booking_${booking.status}`,
          title: statusMessages[booking.status] || `Booking ${booking.status}`,
          description: `${booking.seekers?.first_name || ''} ${booking.seekers?.last_name || ''}`.trim() || 'Unknown User' + 
                      ` ${booking.status === 'pending' ? 'requested' : booking.status} booking for ${booking.listings?.name || 'Unknown Space'}`,
          avatar: booking.seekers?.avatar_url || '/assets/images/no_image.png',
          timestamp: booking.status === 'pending' ? booking.created_at : booking.updated_at,
          priority: booking.status === 'pending' ? 'high' : booking.status === 'cancelled' ? 'medium' : 'normal',
          raw: booking
        })
      })

      // Process LISTINGS/SPACES
      listingsData.forEach(listing => {
        const statusMessages = {
          pending: 'Space Listing Submitted',
          active: 'Space Listing Approved',
          rejected: 'Space Listing Rejected',
          suspended: 'Space Listing Suspended'
        }
        
        const isStatusChange = listing.updated_at !== listing.created_at && listing.status !== 'pending'
        const isResubmission = listing.status === 'pending' && listing.rejected_at !== null && listing.rejected_at !== undefined
        
        if (listing.status === 'pending' || isStatusChange) {
          const title = isResubmission 
            ? 'Space Listing Resubmitted' 
            : (statusMessages[listing.status] || `Space ${listing.status}`)
          
          const description = isResubmission
            ? `${listing.profiles?.first_name || ''} ${listing.profiles?.last_name || ''}`.trim() || 'Unknown Partner' + 
              ` resubmitted space "${listing.name}" for review`
            : `${listing.profiles?.first_name || ''} ${listing.profiles?.last_name || ''}`.trim() || 'Unknown Partner' + 
              ` ${listing.status === 'pending' ? 'submitted' : `space "${listing.name}" was ${listing.status}`}`
          
          activitiesList.push({
            id: `listing_${listing.id}_${listing.status}_${listing.updated_at}`,
            type: isResubmission ? 'listing_resubmitted' : `listing_${listing.status}`,
            title: title,
            description: description,
            avatar: listing.profiles?.avatar_url || '/assets/images/no_image.png',
            timestamp: isStatusChange ? listing.updated_at : listing.created_at,
            priority: listing.status === 'pending' || listing.status === 'suspended' ? 'high' : 'normal',
            raw: listing
          })
        }
      })

      // Process REVIEWS
      reviewsData.forEach(review => {
        activitiesList.push({
          id: `review_${review.id}`,
          type: 'review_created',
          title: 'New Review Submitted',
          description: `${review.profiles?.first_name || ''} ${review.profiles?.last_name || ''}`.trim() || 'User' + 
                      ` left a ${review.rating}-star review for "${review.listings?.name || 'Unknown Space'}"`,
          avatar: review.profiles?.avatar_url || '/assets/images/no_image.png',
          timestamp: review.created_at,
          priority: review.rating <= 2 ? 'high' : 'normal',
          raw: review
        })
      })

      // Process PAYMENT LOGS
      paymentLogs.forEach(payment => {
        if (payment.status === 'succeeded' || payment.status === 'failed') {
          activitiesList.push({
            id: `payment_${payment.id}`,
            type: `payment_${payment.status}`,
            title: payment.status === 'succeeded' ? 'Payment Successful' : 'Payment Failed',
            description: `Payment ${payment.status} for ${payment.bookings?.listings?.name || 'booking'} - $${payment.amount?.toFixed(2) || '0.00'}`,
            avatar: '/assets/images/no_image.png',
            timestamp: payment.created_at,
            priority: payment.status === 'failed' ? 'high' : 'normal',
            raw: payment
          })
        }
      })

      // Process SUPPORT TICKETS
      ticketsData.forEach(ticket => {
        const isStatusChange = ticket.updated_at !== ticket.created_at
        activitiesList.push({
          id: `ticket_${ticket.id}_${ticket.status}`,
          type: isStatusChange ? `ticket_${ticket.status}` : 'support_ticket',
          title: isStatusChange ? `Support Ticket ${ticket.status}` : 'Support Ticket Created',
          description: `${ticket.profiles?.first_name || ''} ${ticket.profiles?.last_name || ''}`.trim() || 'User' + 
                      ` ${isStatusChange ? `ticket "${ticket.subject}" is now ${ticket.status}` : `reported: ${ticket.subject}`}`,
          avatar: ticket.profiles?.avatar_url || '/assets/images/no_image.png',
          timestamp: isStatusChange ? ticket.updated_at : ticket.created_at,
          priority: ticket.priority === 'urgent' ? 'urgent' : ticket.priority === 'high' ? 'high' : 'normal',
          raw: ticket
        })
      })

      // Process BOOKING MODIFICATIONS
      bookingMods.forEach(mod => {
        activitiesList.push({
          id: `booking_mod_${mod.id}`,
          type: 'booking_modification',
          title: 'Booking Modified',
          description: `Booking modification requested for ${mod.bookings?.listings?.name || 'booking'}`,
          avatar: '/assets/images/no_image.png',
          timestamp: mod.created_at,
          priority: 'medium',
          raw: mod
        })
      })

      // Process CONVERSATIONS
      conversations.forEach(conv => {
        activitiesList.push({
          id: `conversation_${conv.id}`,
          type: 'conversation_started',
          title: 'New Conversation Started',
          description: 'Users started a new conversation',
          avatar: '/assets/images/no_image.png',
          timestamp: conv.created_at,
          priority: 'low',
          raw: conv
        })
      })

      // Process FAVORITES
      favorites.forEach(fav => {
        activitiesList.push({
          id: `favorite_${fav.id}`,
          type: 'favorite_added',
          title: 'Space Added to Favorites',
          description: `${fav.profiles?.first_name || ''} ${fav.profiles?.last_name || ''}`.trim() || 'User' + 
                      ` added "${fav.listings?.name || 'space'}" to favorites`,
          avatar: fav.profiles?.avatar_url || '/assets/images/no_image.png',
          timestamp: fav.created_at,
          priority: 'low',
          raw: fav
        })
      })

      // Process ANNOUNCEMENTS
      announcements.forEach(announcement => {
        activitiesList.push({
          id: `announcement_${announcement.id}`,
          type: 'announcement_published',
          title: 'Announcement Published',
          description: `New announcement: "${announcement.title}"`,
          avatar: '/assets/images/no_image.png',
          timestamp: announcement.publish_date || announcement.created_at,
          priority: 'normal',
          raw: announcement
        })
      })

      // Process MODERATION ACTIONS
      moderationActions.forEach(action => {
        activitiesList.push({
          id: `moderation_${action.id}`,
          type: `moderation_${action.action}`,
          title: `Moderation: ${action.action}`,
          description: `${action.profiles?.first_name || 'Admin'}` + 
                      ` ${action.action}d ${action.target_type}${action.reason ? `: ${action.reason}` : ''}`,
          avatar: action.profiles?.avatar_url || '/assets/images/no_image.png',
          timestamp: action.created_at,
          priority: action.action === 'reject' || action.action === 'suspend' ? 'high' : 'normal',
          raw: action
        })
      })

      // Process PAYOUT REQUESTS
      payoutRequests.forEach(payout => {
        const statusMessages = {
          pending: 'Payout Request Submitted',
          processing: 'Payout Processing',
          successful: 'Payout Completed',
          failed: 'Payout Failed'
        }
        activitiesList.push({
          id: `payout_${payout.id}_${payout.updated_at}`,
          type: `payout_${payout.status}`,
          title: statusMessages[payout.status] || `Payout ${payout.status}`,
          description: `${payout.profiles?.first_name || ''} ${payout.profiles?.last_name || ''}`.trim() || payout.partner_name || 'Partner' + 
                      ` ${payout.status === 'pending' ? 'requested' : payout.status} payout of $${payout.amount?.toFixed(2) || '0.00'}`,
          avatar: payout.profiles?.avatar_url || '/assets/images/no_image.png',
          timestamp: payout.status === 'pending' ? payout.requested_at : (payout.processed_at || payout.updated_at),
          priority: payout.status === 'failed' ? 'high' : payout.status === 'pending' ? 'medium' : 'normal',
          raw: payout
        })
      })

      // Process USER STATUS CHANGES
      userStatusHistory.forEach(statusChange => {
        const statusMessages = {
          'active': 'User Reinstated',
          'suspended': 'User Suspended',
          'inactive': 'User Deactivated',
          'pending': 'User Status Changed'
        }
        const isSuspension = statusChange.new_status === 'suspended'
        const isReinstatement = statusChange.new_status === 'active' && statusChange.old_status === 'suspended'
        
        activitiesList.push({
          id: `user_status_${statusChange.id}`,
          type: `user_status_${statusChange.new_status}`,
          title: statusMessages[statusChange.new_status] || `User Status: ${statusChange.new_status}`,
          description: `${statusChange.profiles?.first_name || ''} ${statusChange.profiles?.last_name || ''}`.trim() || 'User' + 
                      ` was ${isReinstatement ? 'reinstated' : isSuspension ? 'suspended' : `changed to ${statusChange.new_status}`}` +
                      (statusChange.changed_by_profile ? ` by ${statusChange.changed_by_profile.first_name || 'Admin'}` : '') +
                      (statusChange.reason ? `: ${statusChange.reason}` : ''),
          avatar: statusChange.profiles?.avatar_url || '/assets/images/no_image.png',
          timestamp: statusChange.created_at,
          priority: isSuspension ? 'high' : isReinstatement ? 'medium' : 'normal',
          raw: statusChange
        })
      })

      // Process PLATFORM SETTINGS CHANGES
      platformSettingsHistory.forEach(setting => {
        activitiesList.push({
          id: `platform_setting_${setting.id}`,
          type: 'platform_setting_changed',
          title: 'Platform Setting Updated',
          description: `${setting.changed_by_name || 'Admin'}` + 
                      ` updated "${setting.setting_key}" in ${setting.category || 'settings'}`,
          avatar: '/assets/images/no_image.png',
          timestamp: setting.created_at,
          priority: 'low',
          raw: setting
        })
      })

      // Process MESSAGES (First messages in conversations)
      // DISABLED: Message sent activities removed from recent activities feed
      // messages.forEach(message => {
      //   // Only show first messages (to avoid spam)
      //   activitiesList.push({
      //     id: `message_${message.id}`,
      //     type: 'message_sent',
      //     title: 'New Message Sent',
      //     description: `${message.profiles?.first_name || ''} ${message.profiles?.last_name || ''}`.trim() || 'User' + 
      //                 ` sent a message${message.content ? `: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}` : ''}`,
      //     avatar: message.profiles?.avatar_url || '/assets/images/no_image.png',
      //     timestamp: message.created_at,
      //     priority: 'low',
      //     raw: message
      //   })
      // })

      // Process CONTENT REPORTS
      contentReports.forEach(report => {
        const statusMessages = {
          pending: 'Content Reported',
          under_review: 'Report Under Review',
          resolved: 'Report Resolved',
          dismissed: 'Report Dismissed',
          escalated: 'Report Escalated'
        }
        activitiesList.push({
          id: `content_report_${report.id}`,
          type: `content_report_${report.status}`,
          title: statusMessages[report.status] || `Content Report ${report.status}`,
          description: `${report.profiles?.first_name || ''} ${report.profiles?.last_name || ''}`.trim() || 'User' + 
                      ` reported ${report.reported_item_type} (${report.report_type})`,
          avatar: report.profiles?.avatar_url || '/assets/images/no_image.png',
          timestamp: report.status === 'pending' ? report.created_at : report.updated_at,
          priority: report.priority === 'urgent' ? 'urgent' : report.priority === 'high' ? 'high' : 'normal',
          raw: report
        })
      })

      // Process CONTENT MODERATION ACTIONS
      contentModeration.forEach(mod => {
        const actionMessages = {
          approve: 'Content Approved',
          reject: 'Content Rejected',
          edit: 'Content Edited',
          remove: 'Content Removed',
          warn_user: 'User Warned',
          suspend_user: 'User Suspended',
          ban_user: 'User Banned',
          escalate: 'Escalated'
        }
        activitiesList.push({
          id: `content_mod_${mod.id}`,
          type: `content_mod_${mod.action_type}`,
          title: actionMessages[mod.action_type] || `Moderation: ${mod.action_type}`,
          description: `${mod.profiles?.first_name || 'Admin'}` + 
                      ` ${mod.action_type} ${mod.affected_content_type || 'content'}` +
                      (mod.affected_user_profile ? ` for ${mod.affected_user_profile.first_name || 'user'}` : '') +
                      (mod.action_reason ? `: ${mod.action_reason}` : ''),
          avatar: mod.profiles?.avatar_url || '/assets/images/no_image.png',
          timestamp: mod.created_at,
          priority: mod.action_type === 'ban_user' || mod.action_type === 'suspend_user' ? 'high' : 'normal',
          raw: mod
        })
      })

      // Process USER NOTES
      userNotes.forEach(note => {
        activitiesList.push({
          id: `user_note_${note.id}`,
          type: 'user_note_added',
          title: note.is_internal ? 'Internal Note Added' : 'User Note Added',
          description: `${note.created_by_profile?.first_name || 'Admin'}` + 
                      ` added ${note.is_internal ? 'internal ' : ''}note for ${note.profiles?.first_name || ''} ${note.profiles?.last_name || ''}`.trim() || 'user',
          avatar: note.created_by_profile?.avatar_url || '/assets/images/no_image.png',
          timestamp: note.created_at,
          priority: 'low',
          raw: note
        })
      })

      // Process ADMIN USER CREATION
      adminUsers.forEach(admin => {
        activitiesList.push({
          id: `admin_user_${admin.id}`,
          type: 'admin_user_created',
          title: 'Admin User Created',
          description: `New ${admin.role || 'admin'} account created for ${admin.profiles?.first_name || ''} ${admin.profiles?.last_name || ''}`.trim() || admin.email,
          avatar: admin.profiles?.avatar_url || '/assets/images/no_image.png',
          timestamp: admin.created_at,
          priority: 'normal',
          raw: admin
        })
      })

      // Process PARTNER BANKING UPDATES
      partnerBanking.forEach(banking => {
        if (banking.is_verified && banking.verified_at) {
          activitiesList.push({
            id: `banking_verified_${banking.id}`,
            type: 'banking_verified',
            title: 'Banking Details Verified',
            description: `Banking details verified for ${banking.profiles?.first_name || ''} ${banking.profiles?.last_name || ''}`.trim() || 'Partner',
            avatar: banking.profiles?.avatar_url || '/assets/images/no_image.png',
            timestamp: banking.verified_at || banking.updated_at,
            priority: 'normal',
            raw: banking
          })
        }
      })

      // Process EARNINGS
      earnings.forEach(earning => {
        activitiesList.push({
          id: `earning_${earning.id}`,
          type: `earning_${earning.status}`,
          title: `Earning ${earning.status}`,
          description: `${earning.profiles?.first_name || ''} ${earning.profiles?.last_name || ''}`.trim() || 'Partner' + 
                      ` earned $${earning.net_amount?.toFixed(2) || '0.00'} (gross: $${earning.gross_amount?.toFixed(2) || '0.00'})`,
          avatar: earning.profiles?.avatar_url || '/assets/images/no_image.png',
          timestamp: earning.created_at,
          priority: 'normal',
          raw: earning
        })
      })

      // Process REVIEW REQUESTS
      reviewRequests.forEach(request => {
        activitiesList.push({
          id: `review_request_${request.id}`,
          type: `review_request_${request.status}`,
          title: request.status === 'pending' ? 'Review Requested' : `Review Request ${request.status}`,
          description: `Review requested for ${request.listings?.name || 'space'} from ${request.profiles?.first_name || ''} ${request.profiles?.last_name || ''}`.trim() || 'seeker',
          avatar: request.profiles?.avatar_url || '/assets/images/no_image.png',
          timestamp: request.requested_at,
          priority: 'low',
          raw: request
        })
      })

      // Process DOCUMENTATION PUBLISHED
      documentation.forEach(doc => {
        activitiesList.push({
          id: `doc_published_${doc.id}`,
          type: 'documentation_published',
          title: 'Documentation Published',
          description: `"${doc.title}" documentation published${doc.profiles ? ` by ${doc.profiles.first_name || 'Admin'}` : ''}`,
          avatar: doc.profiles?.avatar_url || '/assets/images/no_image.png',
          timestamp: doc.published_at || doc.created_at,
          priority: 'normal',
          raw: doc
        })
      })

      // Process LEGAL PAGES PUBLISHED
      legalPages.forEach(page => {
        activitiesList.push({
          id: `legal_page_${page.id}`,
          type: 'legal_page_published',
          title: `${page.page_type || 'Legal'} Page Published`,
          description: `"${page.title}" ${page.page_type || 'legal'} page published${page.profiles ? ` by ${page.profiles.first_name || 'Admin'}` : ''}`,
          avatar: page.profiles?.avatar_url || '/assets/images/no_image.png',
          timestamp: page.published_at || page.created_at,
          priority: 'normal',
          raw: page
        })
      })

      // Process INVITE TOKENS USED
      inviteTokens.forEach(token => {
        activitiesList.push({
          id: `invite_used_${token.id}`,
          type: 'invite_token_used',
          title: 'Admin Invite Accepted',
          description: `${token.used_by_profile?.first_name || ''} ${token.used_by_profile?.last_name || ''}`.trim() || token.email + 
                      ` accepted ${token.role || 'admin'} invite${token.invited_by ? ` from ${token.profiles?.first_name || 'Admin'}` : ''}`,
          avatar: token.used_by_profile?.avatar_url || '/assets/images/no_image.png',
          timestamp: token.used_at,
          priority: 'normal',
          raw: token
        })
      })

      // Process PAYOUT STATUS CHANGES
      payoutStatusChanges.forEach(profile => {
        if (profile.payout_disabled_at) {
          activitiesList.push({
            id: `payout_status_${profile.id}_${profile.payout_disabled_at}`,
            type: profile.payout_disabled ? 'payout_disabled' : 'payout_enabled',
            title: profile.payout_disabled ? 'Payout Disabled' : 'Payout Enabled',
            description: `Payout requests ${profile.payout_disabled ? 'disabled' : 'enabled'} for ${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'user' +
                        (profile.payout_disabled_reason ? `: ${profile.payout_disabled_reason}` : ''),
            avatar: profile.avatar_url || '/assets/images/no_image.png',
            timestamp: profile.payout_disabled_at || profile.updated_at,
            priority: profile.payout_disabled ? 'high' : 'normal',
            raw: profile
          })
        }
      })

      // Sort by timestamp and remove duplicates
      const sortedActivities = activitiesList
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      
      // Remove duplicates by ID and filter out message_sent activities
      const uniqueActivities = sortedActivities
        .filter(activity => activity.type !== 'message_sent') // Remove "New Message Sent" activities
        .filter((activity, index, self) =>
          index === self.findIndex(a => a.id === activity.id)
        )

      setAllActivities(uniqueActivities)
      setDisplayedActivities(uniqueActivities.slice(0, 4)) // Always start with 4
      setDisplayCount(4) // Reset display count
      
      const totalTime = performance.now() - startTime
      console.log(`✅ All activities loaded: ${uniqueActivities.length} total activities in ${totalTime.toFixed(2)}ms`)

    } catch (err) {
      console.error('Error fetching activities:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(() => {
    if (loadingMore || displayCount >= allActivities.length) return
    
    setLoadingMore(true)
    
    // Simulate loading delay for smooth UX
    setTimeout(() => {
      const newCount = Math.min(displayCount + increment, allActivities.length)
      setDisplayCount(newCount)
      setDisplayedActivities(allActivities.slice(0, newCount))
      setLoadingMore(false)
    }, 300)
  }, [allActivities, displayCount, loadingMore, increment])

  // Setup realtime subscriptions (similar to before but update allActivities)
  const setupRealtimeSubscription = () => {
    const subscriptions = []

    subscriptions.push(supabase
      .channel('activities_profiles')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload) => {
          const newUser = payload.new
          const newActivity = {
            id: `user_reg_${newUser.id}`,
            type: 'user_registration',
            title: 'New User Registration',
            description: `${newUser.first_name || ''} ${newUser.last_name || ''}`.trim() || 'Unknown User' + ` registered`,
            avatar: newUser.avatar_url || '/assets/images/no_image.png',
            timestamp: newUser.created_at,
            priority: 'normal',
            raw: newUser
          }
          setAllActivities(prev => {
            const updated = [newActivity, ...prev]
            const sorted = updated.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            return sorted
          })
        })
      .subscribe())

    // Add other subscriptions similarly...

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe())
    }
  }

  useEffect(() => {
    if (authLoading) {
      setLoading(true)
      return
    }

    if (!user || !isAdmin) {
      setAllActivities([])
      setDisplayedActivities([])
      setLoading(false)
      return
    }

    fetchAllActivities()
    const cleanup = setupRealtimeSubscription()
    
    return () => {
      if (cleanup) cleanup()
    }
  }, [user, isAdmin, authLoading, fetchAllActivities])

  // Update displayed activities when displayCount changes
  useEffect(() => {
    if (allActivities.length > 0) {
      setDisplayedActivities(allActivities.slice(0, displayCount))
    }
  }, [displayCount, allActivities])

  const formatTimestamp = (timestamp) => {
    const now = new Date()
    const activityTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    
    return activityTime.toLocaleDateString()
  }

  const hasMore = displayCount < allActivities.length

  return {
    activities: displayedActivities.map(activity => ({
      ...activity,
      timestamp: formatTimestamp(activity.timestamp)
    })),
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refetch: fetchAllActivities
  }
}

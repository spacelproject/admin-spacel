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

export const useActivityFeedAll = (enabled = true) => {
  const [allActivities, setAllActivities] = useState([])
  const [displayedActivities, setDisplayedActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [displayCount, setDisplayCount] = useState(20) // Show 20 at a time
  const increment = 20 // Load 20 more each time
  const { user, isAdmin, loading: authLoading } = useAuth()

  const fetchAllActivities = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      console.log('✅ Fetching all activities...')
      const startTime = performance.now()
      
      // Execute all queries in parallel - fetch larger batches
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
        moderationActions
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
        
        if (listing.status === 'pending' || isStatusChange) {
          activitiesList.push({
            id: `listing_${listing.id}_${listing.status}_${listing.updated_at}`,
            type: `listing_${listing.status}`,
            title: statusMessages[listing.status] || `Space ${listing.status}`,
            description: `${listing.profiles?.first_name || ''} ${listing.profiles?.last_name || ''}`.trim() || 'Unknown Partner' + 
                        ` ${listing.status === 'pending' ? 'submitted' : `space "${listing.name}" was ${listing.status}`}`,
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

      // Sort by timestamp and remove duplicates
      const sortedActivities = activitiesList
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      
      // Remove duplicates by ID
      const uniqueActivities = sortedActivities.filter((activity, index, self) =>
        index === self.findIndex(a => a.id === activity.id)
      )

      setAllActivities(uniqueActivities)
      setDisplayedActivities(uniqueActivities.slice(0, displayCount))
      
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

  // Reset display count when modal opens
  useEffect(() => {
    if (enabled) {
      setDisplayCount(20) // Reset to initial display count
      setDisplayedActivities([])
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }

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
  }, [user, isAdmin, authLoading, fetchAllActivities, enabled])

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
    totalCount: allActivities.length,
    refetch: fetchAllActivities
  }
}

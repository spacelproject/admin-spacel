import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NotificationService from '../services/notificationService'

export const usePendingApprovals = () => {
  const [allPendingItems, setAllPendingItems] = useState([])
  const [displayedItems, setDisplayedItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [displayCount, setDisplayCount] = useState(3) // Show 3 at a time
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const increment = 3 // Load 3 more each time
  const { user, isAdmin } = useAuth()

  const fetchPendingItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all pending listings with partner information
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select(`
          id,
          name,
          description,
          address,
          images,
          category,
          subcategory,
          hourly_price,
          daily_price,
          capacity,
          area,
          status,
          created_at,
          submitted_at,
          rejection_reason,
          admin_notes,
          profiles!inner(
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('status', 'pending')
        .order('submitted_at', { ascending: true })

      if (listingsError) {
        throw listingsError
      }

      // Transform data to match UI format
      const transformedItems = listings?.map(listing => ({
        id: listing.id,
        type: 'space',
        title: listing.name,
        description: listing.description || 'No description provided',
        submittedBy: `${listing.profiles.first_name} ${listing.profiles.last_name}`.trim() || 'Unknown User',
        submittedAt: formatTimeAgo(listing.submitted_at || listing.created_at),
        priority: determinePriority(listing.submitted_at),
        image: listing.images?.[0] || '/assets/images/no_image.png',
        partnerEmail: listing.profiles.email,
        partnerId: listing.profiles.id,
        partnerAvatar: listing.profiles.avatar_url || '/assets/images/no_image.png',
        listingData: listing
      })) || []

      // Store all items but only display 3 initially
      const initialCount = 3
      setAllPendingItems(transformedItems)
      setDisplayCount(initialCount)
      // Explicitly slice to only 3 items
      const itemsToDisplay = transformedItems.slice(0, initialCount)
      setDisplayedItems(itemsToDisplay)
      console.log(`✅ Loaded ${transformedItems.length} pending items, displaying ${itemsToDisplay.length}`)
    } catch (err) {
      console.error('Error fetching pending items:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(() => {
    if (loadingMore || displayCount >= allPendingItems.length) return
    
    setLoadingMore(true)
    
    // Simulate loading delay for smooth UX
    setTimeout(() => {
      const newCount = Math.min(displayCount + increment, allPendingItems.length)
      setDisplayCount(newCount)
      setDisplayedItems(allPendingItems.slice(0, newCount))
      setLoadingMore(false)
    }, 300)
  }, [allPendingItems, displayCount, loadingMore, increment])

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('pending-approvals-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'listings',
          filter: 'status=eq.pending'
        }, 
        (payload) => {
          console.log('Pending approvals change received:', payload)
          fetchPendingItems() // Refresh data when changes occur
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }

  useEffect(() => {
    if (!isAdmin) return

    fetchPendingItems()
    const cleanup = setupRealtimeSubscription()
    
    return () => {
      if (cleanup) cleanup()
    }
  }, [isAdmin, fetchPendingItems])

  const approveItem = async (itemId, adminNotes = '') => {
    if (isApproving) {
      return { success: false, error: 'Approval already in progress' }
    }

    try {
      setIsApproving(true)
      
      // First, get the listing data to send notification
      const { data: listingData, error: fetchError } = await supabase
        .from('listings')
        .select('id, name, partner_id')
        .eq('id', itemId)
        .single()

      if (fetchError) {
        throw fetchError
      }

      const nowIso = new Date().toISOString()

      // Update listing status
      const { error } = await supabase
        .from('listings')
        .update({
          status: 'active',
          approved_at: nowIso,
          approved_by: user.id,
          admin_notes: adminNotes
        })
        .eq('id', itemId)

      if (error) {
        throw error
      }

      // Send approval email to partner
      try {
        const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
          body: {
            listingId: itemId,
            adminNotes: adminNotes || null,
            approvedAt: nowIso
          }
        })
        
        if (emailError) {
          console.error('Error sending approval email:', emailError)
          // Don't fail the approval if email fails, just log it
        } else {
          console.log('✅ Approval email sent to partner')
        }
      } catch (emailErr) {
        console.error('Error invoking approval email function:', emailErr)
        // Don't fail the approval if email fails
      }

      // Send in-app approval notification to partner
      const notificationResult = await NotificationService.sendListingApprovalNotification(
        listingData, 
        listingData.partner_id
      )

      if (!notificationResult.success) {
        console.warn('Failed to send approval notification:', notificationResult.error)
      }

      // Update local state - remove from both all and displayed
      setAllPendingItems(prev => prev.filter(item => item.id !== itemId))
      setDisplayedItems(prev => prev.filter(item => item.id !== itemId))
      
      console.log(`✅ Approved listing: ${itemId}`)
      return { success: true }
    } catch (err) {
      console.error('Error approving item:', err)
      return { success: false, error: err.message }
    } finally {
      setIsApproving(false)
    }
  }

  const rejectItem = async (itemId, rejectionReason, adminNotes = '') => {
    if (isRejecting) {
      return { success: false, error: 'Rejection already in progress' }
    }

    try {
      setIsRejecting(true)
      
      // First, get the listing data to send notification
      const { data: listingData, error: fetchError } = await supabase
        .from('listings')
        .select('id, name, partner_id')
        .eq('id', itemId)
        .single()

      if (fetchError) {
        throw fetchError
      }

      // Update listing status
      const { error } = await supabase
        .from('listings')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: user.id,
          rejection_reason: rejectionReason,
          admin_notes: adminNotes
        })
        .eq('id', itemId)

      if (error) {
        throw error
      }

      // Send rejection email to partner
      try {
        console.log('📧 Sending rejection email for listing:', itemId)
        const { error: emailError, data: emailData } = await supabase.functions.invoke('send-rejection-email', {
          body: {
            listingId: itemId,
            rejectionReason: rejectionReason,
            rejectedAt: new Date().toISOString()
          }
        })
        if (emailError) {
          console.error('❌ Error sending listing rejection email:', emailError)
        } else {
          console.log('✅ Rejection email sent to partner successfully:', emailData)
        }
      } catch (emailErr) {
        console.error('Error invoking rejection email function:', emailErr)
      }

      // Send rejection notification to partner
      const notificationResult = await NotificationService.sendListingRejectionNotification(
        listingData, 
        listingData.partner_id, 
        rejectionReason
      )

      if (!notificationResult.success) {
        console.warn('Failed to send rejection notification:', notificationResult.error)
      }

      // Update local state - remove from both all and displayed
      setAllPendingItems(prev => prev.filter(item => item.id !== itemId))
      setDisplayedItems(prev => prev.filter(item => item.id !== itemId))
      
      console.log(`❌ Rejected listing: ${itemId}`)
      return { success: true }
    } catch (err) {
      console.error('Error rejecting item:', err)
      return { success: false, error: err.message }
    } finally {
      setIsRejecting(false)
    }
  }

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`
    
    return date.toLocaleDateString()
  }

  const determinePriority = (submittedAt) => {
    const submitted = new Date(submittedAt)
    const now = new Date()
    const hoursSinceSubmission = (now - submitted) / (1000 * 60 * 60)
    
    if (hoursSinceSubmission > 48) return 'high'
    if (hoursSinceSubmission > 24) return 'normal'
    return 'low'
  }

  const hasMore = displayCount < allPendingItems.length

  return {
    pendingItems: displayedItems,
    allPendingItems: allPendingItems,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    approveItem,
    rejectItem,
    isApproving,
    isRejecting,
    refreshData: fetchPendingItems
  }
}

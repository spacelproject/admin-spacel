import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logWarn, logError, logDebug } from '../utils/logger'
import NotificationService from '../services/notificationService'

/**
 * Calculate user statistics (bookings, spending, earnings)
 * @param {string} userId - User ID
 * @param {string} userRole - User role (seeker, partner, etc.)
 * @param {Array} bookingsData - Array of booking records
 * @param {Array} earningsData - Array of earnings records
 * @returns {Object} Object containing totalBookings, totalSpent, and totalEarnings
 */
const calculateUserStats = (userId, userRole, bookingsData, earningsData) => {
  const userBookings = bookingsData?.filter(booking => 
    userRole === 'seeker' ? booking.seeker_id === userId : false
  ) || []

  const userEarnings = earningsData?.filter(earning => 
    userRole === 'partner' ? earning.partner_id === userId : false
  ) || []

  // For partners, also count bookings where they are the partner
  const partnerBookings = bookingsData?.filter(booking => 
    userRole === 'partner' ? booking.listings?.partner_id === userId : false
  ) || []

  const totalBookings = userRole === 'seeker' ? userBookings.length : partnerBookings.length
  
  // Correct total spent calculation for seekers
  const totalSpent = userBookings.reduce((sum, booking) => {
    // Only count paid bookings
    if (booking.payment_status !== 'paid') return sum
    
    // Use total_paid if available, otherwise use price
    const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0
    return sum + amount
  }, 0)
  
  // Calculate earnings from earnings table
  const earningsTableTotal = userEarnings.reduce((sum, earning) => 
    sum + (parseFloat(earning.net_amount) || 0), 0
  )

  // Calculate partner earnings: price - commission_partner (exactly like database)
  const bookingEarnings = partnerBookings.reduce((sum, booking) => {
    // Only count paid bookings
    if (booking.payment_status !== 'paid') return sum
    
    // Calculate partner earnings: price - commission_partner
    const price = parseFloat(booking.price) || 0
    const commission = parseFloat(booking.commission_partner) || 0
    const partnerEarnings = price - commission
    return sum + partnerEarnings
  }, 0)

  // Total earnings = booking earnings + earnings table total (exactly like database)
  const finalEarnings = bookingEarnings + earningsTableTotal

  return { totalBookings, totalSpent, totalEarnings: finalEarnings }
}

/**
 * Determine user status based on activity and presence
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @param {string|Date} lastActive - Last active timestamp
 * @param {Object} presence - User presence data
 * @returns {string} User status ('active' or 'inactive')
 */
const getUserStatus = (dbStatus, lastActive, presence) => {
  // Always respect explicit database status when present
  if (dbStatus === 'suspended' || dbStatus === 'pending' || dbStatus === 'inactive') {
    return dbStatus
  }

  // Check if user was active in the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const isRecentlyActive = new Date(lastActive) > thirtyDaysAgo
  
  if (presence?.is_online) {
    return 'active'
  } else if (isRecentlyActive) {
    return 'active'
  } else {
    return 'inactive'
  }
}

/**
 * Custom hook for managing users data
 * Provides user list, CRUD operations, and real-time updates
 * @returns {Object} Users data and operations
 */
export const useUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [adminUsersData, setAdminUsersData] = useState([])
  const { user, isAdmin, loading: authLoading } = useAuth()

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch users with related data (exclude soft-deleted users)
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          role,
          avatar_url,
          phone,
          is_phone_verified,
          company_name,
          company_type,
          location,
          status,
          payout_disabled,
          payout_disabled_at,
          payout_disabled_by,
          payout_disabled_reason,
          deleted_at,
          created_at,
          updated_at
        `)
        .is('deleted_at', null) // Only fetch non-deleted users
        .order('created_at', { ascending: false })

      // Fetch admin users data to get correct admin roles
      const { data: adminUsersData, error: adminUsersError } = await supabase
        .from('admin_users')
        .select(`
          user_id,
          role,
          is_active
        `)
        .eq('is_active', true)

      if (adminUsersError) {
        logWarn('Error fetching admin users:', adminUsersError)
      } else {
        logDebug('Fetched admin users:', { count: adminUsersData?.length || 0 })
        setAdminUsersData(adminUsersData || [])
      }

      if (usersError) {
        throw usersError
      }

      // Get user IDs for filtering
      const userIds = usersData?.map(u => u.id) || []
      if (userIds.length === 0) {
        setUsers([])
        return
      }

      // Fetch booking data server-side filtered by user IDs (optimized)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          seeker_id,
          listing_id,
          total_paid,
          price,
          original_amount,
          service_fee,
          payment_processing_fee,
          partner_fee,
          partner_amount,
          platform_earnings,
          status,
          payment_status,
          created_at,
          updated_at,
          listings!inner(
            partner_id
          )
        `)
        .in('seeker_id', userIds) // Server-side filter for seekers

      if (bookingsError) {
        logWarn('Error fetching bookings:', bookingsError)
      }

      // Fetch partner bookings separately (for partners)
      const { data: partnerBookingsData, error: partnerBookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          seeker_id,
          listing_id,
          total_paid,
          price,
          original_amount,
          service_fee,
          payment_processing_fee,
          partner_fee,
          partner_amount,
          platform_earnings,
          status,
          payment_status,
          created_at,
          updated_at,
          listings!inner(
            partner_id
          )
        `)
        .in('listings.partner_id', userIds) // Server-side filter for partners

      if (partnerBookingsError) {
        logWarn('Error fetching partner bookings:', partnerBookingsError)
      }

      // Combine bookings
      const allBookingsData = [
        ...(bookingsData || []),
        ...(partnerBookingsData || [])
      ]

      // Fetch earnings data server-side filtered by partner IDs
      const { data: earningsData, error: earningsError } = await supabase
        .from('earnings')
        .select(`
          id,
          partner_id,
          net_amount,
          created_at
        `)
        .in('partner_id', userIds) // Server-side filter

      if (earningsError) {
        logWarn('Error fetching earnings:', earningsError)
      }

      // Fetch user presence data server-side filtered
      const { data: presenceData, error: presenceError } = await supabase
        .from('user_presence')
        .select(`
          user_id,
          last_seen,
          is_online
        `)
        .in('user_id', userIds) // Server-side filter

      if (presenceError) {
        logWarn('Error fetching user presence:', presenceError)
      }

      // Transform the data to match the expected format
      const transformedUsers = usersData?.map(user => {
        // Check if user is an admin and get their admin role
        const adminUser = adminUsersData?.find(admin => admin.user_id === user.id)
        const displayRole = adminUser ? adminUser.role : user.role
        
        // Debug logging (sanitized)
        logDebug('Processing user:', { userId: user.id, role: displayRole })
        
        const stats = calculateUserStats(user.id, displayRole, allBookingsData, earningsData)
        const presence = presenceData?.find(p => p.user_id === user.id)
        
        return {
          id: user.id,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No Name',
          email: user.email,
          role: displayRole, // Use admin role if available, otherwise use profile role
          userType: displayRole, // Backwards compat for components expecting userType
          status: getUserStatus(user.status, user.updated_at, presence),
          avatar: user.avatar_url,
          phone: user.phone,
          isPhoneVerified: user.is_phone_verified,
          companyName: user.company_name,
          companyType: user.company_type,
          joinedDate: user.created_at,
          registrationDate: user.created_at, // Backwards compat for mobile card + older filters
          lastActive: presence?.last_seen || user.updated_at,
          lastActivity: presence?.last_seen || user.updated_at, // Backwards compat for mobile card
          isOnline: presence?.is_online || false,
          totalBookings: stats.totalBookings,
          totalSpent: stats.totalSpent,
          totalEarnings: stats.totalEarnings,
          location: user.location || 'Not specified',
          payoutDisabled: user.payout_disabled || false,
          payoutDisabledAt: user.payout_disabled_at,
          payoutDisabledBy: user.payout_disabled_by,
          payoutDisabledReason: user.payout_disabled_reason
        }
      }) || []

      setUsers(transformedUsers)
    } catch (err) {
      logError('Error fetching users:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      setLoading(true)
      return
    }

    // Don't fetch if user is not authenticated or not admin
    if (!user || !isAdmin) {
      setUsers([])
      setLoading(false)
      setError(null)
      return
    }

    let isFetching = false
    const fetchWithLock = async () => {
      if (isFetching) return // Prevent concurrent fetches
      isFetching = true
      try {
        await fetchUsers()
      } finally {
        isFetching = false
      }
    }

    fetchWithLock()
    
    // Set up real-time subscriptions with proper cleanup
    let profilesSubscription = null
    let presenceSubscription = null
    
    const setupRealtimeSubscriptions = () => {
      // Subscribe to profiles table changes
      profilesSubscription = supabase
        .channel(`profiles-changes-${Date.now()}`) // Unique channel name
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'profiles' 
          }, 
          async (payload) => {
            logDebug('Profiles change received:', { eventType: payload.eventType })
            
            // Debounce to prevent race conditions
            if (isFetching) return
            
            if (payload.eventType === 'INSERT') {
              // New user added - fetch fresh data to get complete user info
              fetchWithLock()
            } else if (payload.eventType === 'UPDATE') {
              // User updated - optimistically update the user in the list
              // Fetch the updated user data to get all computed fields
              const { data: updatedProfile, error } = await supabase
                .from('profiles')
                .select(`
                  id,
                  email,
                  first_name,
                  last_name,
                  role,
                  avatar_url,
                  phone,
                  is_phone_verified,
                  company_name,
                  company_type,
                  status,
                  created_at,
                  updated_at
                `)
                .eq('id', payload.new.id)
                .single()
              
              if (!error && updatedProfile) {
                // Transform and update the user in the list
                setUsers(prev => prev.map(user => {
                  if (user.id === updatedProfile.id) {
                    return {
                      ...user,
                      name: `${updatedProfile.first_name || ''} ${updatedProfile.last_name || ''}`.trim() || 'No Name',
                      email: updatedProfile.email,
                      role: updatedProfile.role,
                      phone: updatedProfile.phone,
                      companyName: updatedProfile.company_name,
                      companyType: updatedProfile.company_type,
                      lastActive: updatedProfile.updated_at
                    }
                  }
                  return user
                }))
              }
            } else if (payload.eventType === 'DELETE') {
              // User deleted
              setUsers(prev => prev.filter(user => user.id !== payload.old.id))
            }
          }
        )
        .subscribe()

      // Subscribe to user_presence table changes
      presenceSubscription = supabase
        .channel(`user-presence-changes-${Date.now()}`) // Unique channel name
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'user_presence' 
          }, 
          (payload) => {
            logDebug('User presence change received:', { eventType: payload.eventType })
            
            if (payload.eventType === 'UPDATE') {
              // Update user status based on presence (no fetch needed)
              setUsers(prev => prev.map(user => {
                if (user.id === payload.new.user_id) {
                  const isOnline = payload.new.is_online
                  const lastSeen = payload.new.last_seen
                  
                  // Determine status based on presence and activity
                  let status = 'inactive'
                  if (isOnline) {
                    status = 'active'
                  } else if (lastSeen) {
                    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    const isRecentlyActive = new Date(lastSeen) > thirtyDaysAgo
                    status = isRecentlyActive ? 'active' : 'inactive'
                  }
                  
                  return { ...user, status, lastActive: lastSeen }
                }
                return user
              }))
            }
          }
        )
        .subscribe()
    }

    setupRealtimeSubscriptions()
    
    return () => {
      // Properly cleanup subscriptions
      if (profilesSubscription) {
        try {
          profilesSubscription.unsubscribe()
        } catch (e) {
          logWarn('Error unsubscribing profiles:', e)
        }
      }
      if (presenceSubscription) {
        try {
          presenceSubscription.unsubscribe()
        } catch (e) {
          logWarn('Error unsubscribing presence:', e)
        }
      }
    }
  }, [user, isAdmin, authLoading, fetchUsers])

  const updateUser = async (userId, updates) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          first_name: updates.firstName,
          last_name: updates.lastName,
          role: updates.role,
          phone: updates.phone,
          company_name: updates.companyName,
          company_type: updates.companyType,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()

      if (error) {
        throw error
      }

      // Update local state optimistically
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, ...updates, updated_at: new Date().toISOString() }
          : user
      ))

      return { success: true, data }
    } catch (err) {
      logError('Error updating user:', err)
      return { success: false, error: err.message }
    }
  }

  // Optimistically update a user in the list without refetching
  const updateUserInList = (updatedUser) => {
    setUsers(prev => prev.map(user => 
      user.id === updatedUser.id 
        ? { ...user, ...updatedUser }
        : user
    ))
  }

  // Optimistically add a user to the list without refetching
  const addUserToList = (newUser) => {
    setUsers(prev => [newUser, ...prev])
  }

  const deleteUser = async (userId) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) {
        throw error
      }

      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId))

      return { success: true }
    } catch (err) {
      logError('Error deleting user:', err)
      return { success: false, error: err.message }
    }
  }

  const getUserStats = () => {
    const total = users.length
    const seekers = users.filter(user => user.role === 'seeker').length
    const partners = users.filter(user => user.role === 'partner').length
    const admins = users.filter(user => user.role === 'admin' || user.role === 'super_admin' || user.role === 'moderator').length
    const active = users.filter(user => user.status === 'active').length

    return {
      total,
      seekers,
      partners,
      admins,
      active
    }
  }

  /**
   * Toggle payout disabled status for a user
   * @param {string} userId - User ID
   * @param {boolean} disabled - Whether to disable or enable payout
   * @param {string} reason - Optional reason for disabling payout
   * @returns {Promise<Object>} Success status and data
   */
  const togglePayoutDisabled = async (userId, disabled, reason = null) => {
    try {
      const nowIso = new Date().toISOString()
      const updatePayload = {
        payout_disabled: disabled,
        updated_at: nowIso
      }

      if (disabled) {
        // Disabling payout
        updatePayload.payout_disabled_at = nowIso
        updatePayload.payout_disabled_by = user?.id || null
        updatePayload.payout_disabled_reason = reason || null
      } else {
        // Enabling payout
        updatePayload.payout_disabled_at = null
        updatePayload.payout_disabled_by = null
        updatePayload.payout_disabled_reason = null
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
        .select()

      if (error) {
        throw error
      }

      // Send in-app and push notification to partner
      try {
        if (disabled) {
          await NotificationService.sendPayoutDisabledNotification(userId, reason)
          logDebug('✅ Payout disabled notification sent to partner')
        } else {
          await NotificationService.sendPayoutEnabledNotification(userId)
          logDebug('✅ Payout enabled notification sent to partner')
        }
      } catch (notifError) {
        logWarn('Error sending payout notification:', notifError)
        // Don't throw - notification failure shouldn't block the update
      }

      // Update local state optimistically
      setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { 
              ...u, 
              payoutDisabled: disabled,
              payoutDisabledAt: disabled ? nowIso : null,
              payoutDisabledBy: disabled ? (user?.id || null) : null,
              payoutDisabledReason: disabled ? (reason || null) : null
            }
          : u
      ))

      return { success: true, data }
    } catch (err) {
      logError('Error toggling payout disabled:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    users,
    loading,
    error,
    fetchUsers,
    updateUser,
    deleteUser,
    getUserStats,
    updateUserInList,
    addUserToList,
    togglePayoutDisabled
  }
}

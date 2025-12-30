import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../contexts/AuthContext'

export const useStaff = () => {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { showToast } = useToast()
  const { user } = useAuth()

  // Transform staff data for UI
  const transformStaffData = useCallback((adminUser, profile) => {
    return {
      id: adminUser.id,
      userId: adminUser.user_id,
      email: profile?.email || '',
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      fullName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'No name',
      role: adminUser.role, // 'admin' or 'support'
      isActive: adminUser.is_active,
      lastLogin: adminUser.last_login,
      permissions: adminUser.permissions || [],
      createdAt: adminUser.created_at,
      updatedAt: adminUser.updated_at,
      avatarUrl: profile?.avatar_url || null
    }
  }, [])

  // Fetch all staff (admin and support accounts)
  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch admin_users with joined profile data
      const { data: adminUsersData, error: adminUsersError } = await supabase
        .from('admin_users')
        .select(`
          id,
          user_id,
          role,
          is_active,
          last_login,
          permissions,
          created_at,
          updated_at,
          profiles:user_id (
            id,
            email,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })

      if (adminUsersError) {
        throw adminUsersError
      }

      // Transform data
      const transformedStaff = (adminUsersData || []).map(adminUser => 
        transformStaffData(adminUser, adminUser.profiles)
      )

      setStaff(transformedStaff)
      console.log('✅ Fetched staff:', transformedStaff)
    } catch (err) {
      console.error('❌ Error fetching staff:', err)
      setError(err.message || 'Failed to load staff accounts')
      showToast('Failed to load staff accounts', 'error')
    } finally {
      setLoading(false)
    }
  }, [transformStaffData, showToast])

  // Create staff account
  const createStaff = useCallback(async (staffData) => {
    try {
      setError(null)

      const { email, password, firstName, lastName, role } = staffData

      // Use edge function to create staff account (handles auth, profile, and admin_users)
      // Edge function will use service role key to create auth user with auto-verified email
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing required environment variables: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY')
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          role // 'admin' or 'support'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to create staff account')
      }

      // Refresh staff list
      await fetchStaff()
      showToast('Staff account created successfully', 'success')
      return { success: true, data: result }

    } catch (err) {
      console.error('❌ Error creating staff:', err)
      const errorMessage = err.message || 'Failed to create staff account'
      setError(errorMessage)
      showToast(errorMessage, 'error')
      return { success: false, error: err }
    }
  }, [fetchStaff, showToast])

  // Update staff account
  const updateStaff = useCallback(async (staffId, updates) => {
    try {
      setError(null)

      // Find the staff member to get user_id
      const staffMember = staff.find(s => s.id === staffId)
      if (!staffMember) {
        throw new Error('Staff member not found')
      }

      const { firstName, lastName, email, role } = updates

      // Update profile
      const profileUpdates = {}
      if (firstName !== undefined) profileUpdates.first_name = firstName
      if (lastName !== undefined) profileUpdates.last_name = lastName
      if (email !== undefined) profileUpdates.email = email

      if (Object.keys(profileUpdates).length > 0) {
        profileUpdates.updated_at = new Date().toISOString()
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdates)
          .eq('id', staffMember.userId)

        if (profileError) {
          throw profileError
        }
      }

      // Update admin_users
      const adminUserUpdates = {}
      if (role !== undefined) adminUserUpdates.role = role
      if (Object.keys(adminUserUpdates).length > 0) {
        adminUserUpdates.updated_at = new Date().toISOString()
        const { error: adminUserError } = await supabase
          .from('admin_users')
          .update(adminUserUpdates)
          .eq('id', staffId)

        if (adminUserError) {
          throw adminUserError
        }
      }

      // If email changed, update auth user
      if (email && email !== staffMember.email) {
        // Note: Updating auth email requires admin API or edge function
        // For now, we'll skip this or use an edge function
        console.warn('Email update requires admin API - skipping auth email update')
      }

      // Refresh staff list
      await fetchStaff()
      showToast('Staff account updated successfully', 'success')
      return { success: true }
    } catch (err) {
      console.error('❌ Error updating staff:', err)
      const errorMessage = err.message || 'Failed to update staff account'
      setError(errorMessage)
      showToast(errorMessage, 'error')
      return { success: false, error: err }
    }
  }, [staff, fetchStaff, showToast])

  // Deactivate staff account
  const deactivateStaff = useCallback(async (staffId) => {
    try {
      setError(null)

      // Don't allow deactivating yourself
      const staffMember = staff.find(s => s.id === staffId)
      if (staffMember && staffMember.userId === user?.id) {
        throw new Error('You cannot deactivate your own account')
      }

      const { error } = await supabase
        .from('admin_users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId)

      if (error) {
        throw error
      }

      await fetchStaff()
      showToast('Staff account deactivated successfully', 'success')
      return { success: true }
    } catch (err) {
      console.error('❌ Error deactivating staff:', err)
      const errorMessage = err.message || 'Failed to deactivate staff account'
      setError(errorMessage)
      showToast(errorMessage, 'error')
      return { success: false, error: err }
    }
  }, [staff, user, fetchStaff, showToast])

  // Activate staff account
  const activateStaff = useCallback(async (staffId) => {
    try {
      setError(null)

      const { error } = await supabase
        .from('admin_users')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', staffId)

      if (error) {
        throw error
      }

      await fetchStaff()
      showToast('Staff account activated successfully', 'success')
      return { success: true }
    } catch (err) {
      console.error('❌ Error activating staff:', err)
      const errorMessage = err.message || 'Failed to activate staff account'
      setError(errorMessage)
      showToast(errorMessage, 'error')
      return { success: false, error: err }
    }
  }, [fetchStaff, showToast])

  // Delete staff account
  const deleteStaff = useCallback(async (staffId) => {
    try {
      setError(null)

      // Don't allow deleting yourself
      const staffMember = staff.find(s => s.id === staffId)
      if (staffMember && staffMember.userId === user?.id) {
        throw new Error('You cannot delete your own account')
      }

      // Delete from admin_users (CASCADE will handle profile deletion if configured)
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('id', staffId)

      if (error) {
        throw error
      }

      // Note: We're not deleting the auth user or profile here
      // The profile and auth user will remain but the admin access will be revoked
      // If you want to fully delete, you'd need admin API or edge function

      await fetchStaff()
      showToast('Staff account deleted successfully', 'success')
      return { success: true }
    } catch (err) {
      console.error('❌ Error deleting staff:', err)
      const errorMessage = err.message || 'Failed to delete staff account'
      setError(errorMessage)
      showToast(errorMessage, 'error')
      return { success: false, error: err }
    }
  }, [staff, user, fetchStaff, showToast])

  // Get staff statistics
  const getStats = useCallback(() => {
    const total = staff.length
    const admins = staff.filter(s => s.role === 'admin').length
    const support = staff.filter(s => s.role === 'support').length
    const active = staff.filter(s => s.isActive).length
    const inactive = staff.filter(s => !s.isActive).length

    return {
      total,
      admins,
      support,
      active,
      inactive
    }
  }, [staff])

  // Real-time subscriptions
  useEffect(() => {
    if (!user) return

    fetchStaff()

    // Subscribe to admin_users changes
    const subscription = supabase
      .channel('admin-users-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'admin_users' 
        }, 
        (payload) => {
          console.log('Admin users change received:', payload)
          fetchStaff()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [user, fetchStaff])

  return {
    staff,
    loading,
    error,
    fetchStaff,
    createStaff,
    updateStaff,
    deactivateStaff,
    activateStaff,
    deleteStaff,
    getStats
  }
}


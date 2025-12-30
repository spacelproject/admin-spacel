import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const useDashboardData = () => {
  const [data, setData] = useState({
    users: { total: 0, active: 0, new: 0 },
    listings: { total: 0, active: 0, pending: 0 },
    bookings: { total: 0, confirmed: 0, pending: 0 },
    revenue: { total: 0, monthly: 0, weekly: 0 },
    loading: true,
    error: null
  })
  const { user, isAdmin, loading: authLoading } = useAuth()

  useEffect(() => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...')
      setData(prev => ({ ...prev, loading: true }))
      return
    }

    // Don't fetch if user is not authenticated or not admin
    if (!user || !isAdmin) {
      console.log('⚠️ User not authenticated or not admin, clearing dashboard data')
      setData({
        users: { total: 0, active: 0, new: 0 },
        listings: { total: 0, active: 0, pending: 0 },
        bookings: { total: 0, confirmed: 0, pending: 0 },
        revenue: { total: 0, monthly: 0, weekly: 0 },
        loading: false,
        error: null
      })
      return
    }

    console.log('✅ User authenticated as admin, fetching dashboard data...')
    fetchDashboardData()
  }, [user, isAdmin, authLoading])

  const fetchDashboardData = async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }))

      // Fetch users data
      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, role, created_at')

      // Fetch listings data
      const { data: listingsData, error: listingsError } = await supabase
        .from('listings')
        .select('id, status, created_at')

      // Fetch bookings data
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, status, total_paid, price, created_at')

      // Fetch earnings data (optional, do not fail if table missing/RLS)
      let earningsData = []
      const { data: earningsRaw, error: earningsError } = await supabase
        .from('earnings')
        .select('net_amount, created_at')
      if (!earningsError) {
        earningsData = earningsRaw || []
      } else {
        console.warn('⚠️ Earnings fetch skipped:', earningsError.message)
      }

      // Fail only on critical datasets
      if (usersError || listingsError || bookingsError) {
        console.error('❌ Dashboard fetch errors:', {
          usersError: usersError?.message,
          listingsError: listingsError?.message,
          bookingsError: bookingsError?.message
        })
        const firstErr = usersError || listingsError || bookingsError
        throw new Error(firstErr?.message || 'Failed to fetch dashboard data')
      }

      // Debug: Log booking data to see actual field names and values
      console.log('🔍 Debug - Sample booking data:', bookingsData?.[0])
      console.log('🔍 Debug - All booking revenue fields:', bookingsData?.map(b => ({
        id: b.id,
        total_paid: b.total_paid,
        total: b.total,
        price: b.price
      })))

      // Calculate users stats
      const totalUsers = usersData?.length || 0
      const activeUsers = usersData?.filter(user => user.role === 'partner' || user.role === 'seeker').length || 0
      const newUsers = usersData?.filter(user => {
        const createdAt = new Date(user.created_at)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        return createdAt > thirtyDaysAgo
      }).length || 0

      // Calculate listings stats
      const totalListings = listingsData?.length || 0
      const activeListings = listingsData?.filter(listing => listing.status === 'active').length || 0
      const pendingListings = listingsData?.filter(listing => listing.status === 'pending').length || 0

      // Calculate bookings stats
      const totalBookings = bookingsData?.length || 0
      const confirmedBookings = bookingsData?.filter(booking => booking.status === 'confirmed').length || 0
      const pendingBookings = bookingsData?.filter(booking => booking.status === 'pending').length || 0

      // Calculate revenue stats - try multiple fields to find the correct one
      const totalRevenue = bookingsData?.reduce((sum, booking) => {
        // Try total_paid first, then price as fallback
        const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0
        return sum + amount
      }, 0) || 0
      
      const monthlyRevenue = bookingsData?.filter(booking => {
        const createdAt = new Date(booking.created_at)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        return createdAt > thirtyDaysAgo
      }).reduce((sum, booking) => {
        const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0
        return sum + amount
      }, 0) || 0

      const weeklyRevenue = bookingsData?.filter(booking => {
        const createdAt = new Date(booking.created_at)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        return createdAt > sevenDaysAgo
      }).reduce((sum, booking) => {
        const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0
        return sum + amount
      }, 0) || 0

      // Debug: Log calculated revenue
      console.log('💰 Debug - Calculated revenue:', {
        totalRevenue,
        monthlyRevenue,
        weeklyRevenue,
        totalBookings: bookingsData?.length
      })

      setData({
        users: {
          total: totalUsers,
          active: activeUsers,
          new: newUsers
        },
        listings: {
          total: totalListings,
          active: activeListings,
          pending: pendingListings
        },
        bookings: {
          total: totalBookings,
          confirmed: confirmedBookings,
          pending: pendingBookings
        },
        revenue: {
          total: totalRevenue,
          monthly: monthlyRevenue,
          weekly: weeklyRevenue
        },
        loading: false,
        error: null
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setData(prev => ({
        ...prev,
        loading: false,
        error: error.message
      }))
    }
  }

  return { data, refetch: fetchDashboardData }
}

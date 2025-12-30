import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export const useBookingTrends = (timeRange = '7days') => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const { user, isAdmin, loading: authLoading } = useAuth()

  useEffect(() => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...')
      setLoading(true)
      return
    }

    // Don't fetch if user is not authenticated or not admin
    if (!user || !isAdmin) {
      console.log('⚠️ User not authenticated or not admin, clearing booking trends')
      setData([])
      setLoading(false)
      return
    }

    console.log('✅ User authenticated as admin, fetching booking trends...')
    fetchBookingTrends()
    setupRealtimeSubscription()
  }, [user, isAdmin, authLoading, timeRange])

  const fetchBookingTrends = async () => {
    try {
      setLoading(true)
      setError(null)

      const now = new Date()
      let startDate

      if (timeRange === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (timeRange === '30days') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      } else if (timeRange === 'monthly') {
        // Last 12 months
        startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      } else {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }

      // Fetch bookings data for the selected time range
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          total_paid,
          price,
          service_fee,
          payment_processing_fee,
          created_at,
          status
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      if (bookingsError) {
        throw bookingsError
      }

      // Process data based on time range
      let processedData = []

      if (timeRange === '7days') {
        // Group by day for last 7 days
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const last7Days = []

        for (let i = 6; i >= 0; i--) {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
          const dayName = days[date.getDay()]
          const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
          const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

          const dayBookings = bookingsData?.filter(booking => {
            const bookingDate = new Date(booking.created_at)
            return bookingDate >= dayStart && bookingDate < dayEnd
          }) || []

          const bookingsCount = dayBookings.length
          const revenue = dayBookings.reduce((sum, booking) => 
            sum + (parseFloat(booking.total_paid) || parseFloat(booking.price) || 0), 0
          )

          last7Days.push({
            name: dayName,
            bookings: bookingsCount,
            revenue: Math.round(revenue)
          })
        }

        processedData = last7Days
      } else if (timeRange === '30days') {
        // Group by week for last 30 days
        const weeks = []
        const weekNames = ['Week 1', 'Week 2', 'Week 3', 'Week 4']

        for (let i = 3; i >= 0; i--) {
          const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
          const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)

          const weekBookings = bookingsData?.filter(booking => {
            const bookingDate = new Date(booking.created_at)
            return bookingDate >= weekStart && bookingDate < weekEnd
          }) || []

          const bookingsCount = weekBookings.length
          const revenue = weekBookings.reduce((sum, booking) => 
            sum + (parseFloat(booking.total_paid) || parseFloat(booking.price) || 0), 0
          )

          weeks.push({
            name: weekNames[3 - i],
            bookings: bookingsCount,
            revenue: Math.round(revenue)
          })
        }

        processedData = weeks
      } else if (timeRange === 'monthly') {
        // Group by month for last 12 months
        const months = []
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

        for (let i = 11; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)

          const monthBookings = bookingsData?.filter(booking => {
            const bookingDate = new Date(booking.created_at)
            return bookingDate >= monthStart && bookingDate < monthEnd
          }) || []

          const bookingsCount = monthBookings.length
          const revenue = monthBookings.reduce((sum, booking) => 
            sum + (parseFloat(booking.total_paid) || parseFloat(booking.price) || 0), 0
          )

          months.push({
            name: monthNames[monthDate.getMonth()],
            bookings: bookingsCount,
            revenue: Math.round(revenue)
          })
        }

        processedData = months
      }

      setData(processedData)
    } catch (err) {
      console.error('Error fetching booking trends:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    // Subscribe to booking changes for real-time updates
    const bookingsSubscription = supabase
      .channel('booking_trends_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'bookings' },
        () => {
          console.log('📊 New booking detected, refreshing trends...')
          fetchBookingTrends()
        }
      )
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        () => {
          console.log('📊 Booking updated, refreshing trends...')
          fetchBookingTrends()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      bookingsSubscription.unsubscribe()
    }
  }

  const getChartData = () => {
    if (loading) {
      // Return skeleton data for loading state
      if (timeRange === '7days') {
        return [
          { name: 'Mon', bookings: 0, revenue: 0 },
          { name: 'Tue', bookings: 0, revenue: 0 },
          { name: 'Wed', bookings: 0, revenue: 0 },
          { name: 'Thu', bookings: 0, revenue: 0 },
          { name: 'Fri', bookings: 0, revenue: 0 },
          { name: 'Sat', bookings: 0, revenue: 0 },
          { name: 'Sun', bookings: 0, revenue: 0 }
        ]
      } else {
        return [
          { name: 'Week 1', bookings: 0, revenue: 0 },
          { name: 'Week 2', bookings: 0, revenue: 0 },
          { name: 'Week 3', bookings: 0, revenue: 0 },
          { name: 'Week 4', bookings: 0, revenue: 0 }
        ]
      }
    }

    return data
  }

  const getTotalBookings = () => {
    return data.reduce((sum, item) => sum + item.bookings, 0)
  }

  const getTotalRevenue = () => {
    return data.reduce((sum, item) => sum + item.revenue, 0)
  }

  const getAverageBookingsPerPeriod = () => {
    if (data.length === 0) return 0
    return Math.round(getTotalBookings() / data.length)
  }

  const getAverageRevenuePerPeriod = () => {
    if (data.length === 0) return 0
    return Math.round(getTotalRevenue() / data.length)
  }

  return {
    data: getChartData(),
    loading,
    error,
    refetch: fetchBookingTrends,
    stats: {
      totalBookings: getTotalBookings(),
      totalRevenue: getTotalRevenue(),
      averageBookingsPerPeriod: getAverageBookingsPerPeriod(),
      averageRevenuePerPeriod: getAverageRevenuePerPeriod()
    }
  }
}

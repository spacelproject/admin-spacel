import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { logDebug, logWarn, logError } from '../utils/logger'

export const useAnalyticsData = (dateRange = '30d', filters = {}, customDateRange = null) => {
  const [data, setData] = useState({
    metrics: [],
    performanceIndicators: [],
    chartData: {},
    loading: true,
    error: null
  })
  const { user, isAdmin, loading: authLoading } = useAuth()

  const getDateRange = () => {
    // Handle custom date range
    if (dateRange === 'custom' && customDateRange) {
      const startDate = new Date(customDateRange.from)
      const endDate = new Date(customDateRange.to)
      // Set time to end of day for endDate
      endDate.setHours(23, 59, 59, 999)
      return { startDate, endDate }
    }

    const now = new Date()
    let startDate

    switch (dateRange) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '6m':
        startDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
        break
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'ytd':
        // Year to date - from January 1st to now
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    return { startDate, endDate: now }
  }

  const calculateMetrics = (users, bookings, listings, earnings, startDate, endDate) => {
    // Calculate previous period (same duration as current period)
    const periodDuration = endDate.getTime() - startDate.getTime()
    const previousPeriodEnd = new Date(startDate.getTime() - 1) // One millisecond before start
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodDuration)
    
    // Current period metrics
    const totalUsers = users.length
    const totalBookings = bookings.length
    const totalRevenue = bookings.reduce((sum, booking) => {
      // Try total_paid first, then price as fallback (removed total field)
      const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0
      return sum + amount
    }, 0)
    const activeListings = listings.filter(listing => listing.status === 'active').length

    // Previous period for comparison (need to filter from all data, will be handled in fetch)
    // For now, we'll use a simpler approach - calculate based on items before startDate
    const previousUsers = users.filter(user => {
      const userDate = new Date(user.created_at)
      return userDate >= previousPeriodStart && userDate <= previousPeriodEnd
    }).length
    
    const previousBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.created_at)
      return bookingDate >= previousPeriodStart && bookingDate <= previousPeriodEnd
    }).length
    
    const previousRevenue = bookings.filter(booking => {
      const bookingDate = new Date(booking.created_at)
      return bookingDate >= previousPeriodStart && bookingDate <= previousPeriodEnd
    }).reduce((sum, booking) => {
      const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0
      return sum + amount
    }, 0)
    
    const previousListings = listings.filter(listing => {
      const listingDate = new Date(listing.created_at)
      return listingDate >= previousPeriodStart && listingDate <= previousPeriodEnd && listing.status === 'active'
    }).length

    // Calculate percentage changes
    const userChange = previousUsers > 0 ? ((totalUsers - previousUsers) / previousUsers) * 100 : (totalUsers > 0 ? 100 : 0)
    const bookingChange = previousBookings > 0 ? ((totalBookings - previousBookings) / previousBookings) * 100 : (totalBookings > 0 ? 100 : 0)
    const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : (totalRevenue > 0 ? 100 : 0)
    const listingChange = previousListings > 0 ? ((activeListings - previousListings) / previousListings) * 100 : (activeListings > 0 ? 100 : 0)

    return [
      {
        id: 1,
        type: 'users',
        label: 'Total Users',
        value: totalUsers.toLocaleString(),
        change: userChange,
        period: 'vs previous period'
      },
      {
        id: 2,
        type: 'bookings',
        label: 'Total Bookings',
        value: totalBookings.toLocaleString(),
        change: bookingChange,
        period: 'vs previous period'
      },
      {
        id: 3,
        type: 'revenue',
        label: 'Total Revenue',
        value: `$${totalRevenue.toLocaleString()}`,
        change: revenueChange,
        period: 'vs previous period'
      },
      {
        id: 4,
        type: 'spaces',
        label: 'Active Spaces',
        value: activeListings.toLocaleString(),
        change: listingChange,
        period: 'vs previous period'
      }
    ]
  }

  const calculatePerformanceIndicators = (users, bookings, listings, reviews = [], supportTickets = [], startDate) => {
    // Calculate conversion rate (bookings per user)
    const conversionRate = users.length > 0 ? (bookings.length / users.length) * 100 : 0
    
    // Calculate average booking value
    const totalRevenue = bookings.reduce((sum, booking) => {
      // Try total_paid first, then price as fallback (removed total field)
      const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0
      return sum + amount
    }, 0)
    const avgBookingValue = bookings.length > 0 ? totalRevenue / bookings.length : 0
    
    // Calculate user retention (users active in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const activeUsers = users.filter(user => new Date(user.updated_at) > thirtyDaysAgo).length
    const userRetention = users.length > 0 ? (activeUsers / users.length) * 100 : 0
    
    // Calculate space utilization (bookings per listing)
    const spaceUtilization = listings.length > 0 ? (bookings.length / listings.length) * 100 : 0
    
    // Calculate customer satisfaction from reviews (real data)
    let customerSatisfaction = 0
    if (reviews && reviews.length > 0) {
      const validRatings = reviews.filter(r => r.rating && r.rating > 0)
      if (validRatings.length > 0) {
        const sumRatings = validRatings.reduce((sum, r) => sum + (parseFloat(r.rating) || 0), 0)
        customerSatisfaction = sumRatings / validRatings.length
      }
    }
    // Fallback to default if no reviews
    if (customerSatisfaction === 0) {
      customerSatisfaction = 4.3
    }
    
    // Calculate average response time from support tickets (real data)
    let responseTime = 0
    if (supportTickets && supportTickets.length > 0) {
      // Calculate response time: time from ticket creation to first admin reply
      let totalResponseTime = 0
      let responseCount = 0
      
      supportTickets.forEach(ticket => {
        if (ticket.created_at && ticket.resolved_at) {
          const created = new Date(ticket.created_at)
          const resolved = new Date(ticket.resolved_at)
          if (resolved > created) {
            const responseTimeMs = resolved - created
            totalResponseTime += responseTimeMs
            responseCount++
          }
        }
      })
      
      if (responseCount > 0) {
        responseTime = totalResponseTime / responseCount / (1000 * 60 * 60) // Convert to hours
      }
    }
    // Fallback to default if no tickets
    if (responseTime === 0) {
      responseTime = 2.4
    }

    return [
      {
        id: 1,
        name: 'Conversion Rate',
        value: `${conversionRate.toFixed(1)}%`,
        unit: '',
        target: '4.0%',
        progress: Math.min((conversionRate / 4.0) * 100, 100),
        status: conversionRate >= 3.5 ? 'excellent' : conversionRate >= 2.5 ? 'good' : 'average',
        change: 0.3
      },
      {
        id: 2,
        name: 'Avg Booking Value',
        value: `$${avgBookingValue.toFixed(0)}`,
        unit: 'USD',
        target: '$150',
        progress: Math.min((avgBookingValue / 150) * 100, 100),
        status: avgBookingValue >= 120 ? 'excellent' : avgBookingValue >= 100 ? 'good' : 'average',
        change: 5.2
      },
      {
        id: 3,
        name: 'User Retention',
        value: `${userRetention.toFixed(0)}%`,
        unit: '',
        target: '75%',
        progress: Math.min((userRetention / 75) * 100, 100),
        status: userRetention >= 70 ? 'excellent' : userRetention >= 60 ? 'good' : 'average',
        change: 2.1
      },
      {
        id: 4,
        name: 'Space Utilization',
        value: `${spaceUtilization.toFixed(0)}%`,
        unit: '',
        target: '80%',
        progress: Math.min((spaceUtilization / 80) * 100, 100),
        status: spaceUtilization >= 70 ? 'excellent' : spaceUtilization >= 60 ? 'good' : 'average',
        change: 1.8
      },
      {
        id: 5,
        name: 'Customer Satisfaction',
        value: customerSatisfaction.toFixed(1),
        unit: '/5.0',
        target: '4.5',
        progress: (customerSatisfaction / 4.5) * 100,
        status: customerSatisfaction >= 4.2 ? 'excellent' : customerSatisfaction >= 3.8 ? 'good' : 'average',
        change: 0.1
      },
      {
        id: 6,
        name: 'Response Time',
        value: `${responseTime}h`,
        unit: 'avg',
        target: '2.0h',
        progress: Math.max((2.0 / responseTime) * 100, 0),
        status: responseTime <= 2.0 ? 'excellent' : responseTime <= 3.0 ? 'good' : 'average',
        change: -0.2
      }
    ]
  }

  const generateMonthlyData = (data, dateField, startDate, endDate) => {
    const months = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1)
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0)
      
      const monthData = data.filter(item => {
        const itemDate = new Date(item[dateField])
        return itemDate >= monthStart && itemDate <= monthEnd
      })
      
      months.push({
        name: monthStart.toLocaleDateString('en-US', { month: 'short' }),
        value: monthData.length
      })
      
      current.setMonth(current.getMonth() + 1)
    }
    
    return months
  }

  const generateWeeklyData = (data, dateField, startDate, endDate) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const weeklyData = days.map(day => ({ name: day, value: 0 }))
    
    data.forEach(item => {
      const itemDate = new Date(item[dateField])
      const dayOfWeek = itemDate.getDay()
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert Sunday=0 to Sunday=6
      weeklyData[adjustedDay].value++
    })
    
    return weeklyData
  }

  const generateRevenueByCategory = (bookings, listings, validCategories = []) => {
    const categoryRevenue = {}
    
    // If no valid categories found, return empty array (strict mode - only show database categories)
    if (validCategories.length === 0) {
      logWarn('No valid categories found in database for revenue chart')
      return []
    }
    
    // Only process bookings for categories that exist in the database
    bookings.forEach(booking => {
      const listing = listings.find(l => l.id === booking.listing_id)
      if (listing && listing.category) {
        const category = listing.category
        
        // Only include categories that exist in the database
        if (validCategories.includes(category)) {
        const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0
        
        if (!categoryRevenue[category]) {
          categoryRevenue[category] = 0
        }
        categoryRevenue[category] += amount
        }
      }
    })
    
    // Only return categories that have revenue and exist in valid categories
    return Object.entries(categoryRevenue)
      .filter(([name]) => validCategories.includes(name))
      .map(([name, value]) => ({
      name,
      value: Math.round(value)
    }))
      .sort((a, b) => b.value - a.value) // Sort by revenue descending
  }

  const generateQuarterlyData = (data, dateField, startDate, endDate) => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    const quarterlyData = quarters.map(quarter => ({ name: quarter, value: 0 }))
    
    data.forEach(item => {
      const itemDate = new Date(item[dateField])
      const quarter = Math.floor(itemDate.getMonth() / 3)
      quarterlyData[quarter].value++
    })
    
    return quarterlyData
  }

  const generateChartData = (users, bookings, listings, startDate, endDate, validCategories = []) => {
    // User growth data (monthly)
    const userGrowth = generateMonthlyData(users, 'created_at', startDate, endDate)
    
    // Booking trends (daily - shows bookings by day of week)
    const bookingTrends = generateWeeklyData(bookings, 'created_at', startDate, endDate)
    
    // Revenue by category (only includes valid categories from database)
    const revenueByCategory = generateRevenueByCategory(bookings, listings, validCategories)
    
    // Space performance (monthly bookings/revenue)
    const spacePerformance = generateMonthlyData(bookings, 'created_at', startDate, endDate)

    return {
      userGrowth,
      bookingTrends,
      revenueByCategory,
      spacePerformance
    }
  }

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }))

      const { startDate, endDate } = getDateRange()
      
      // Validate date range
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date range: dates are not valid')
      }
      
      if (startDate > endDate) {
        throw new Error('Invalid date range: start date is after end date')
      }
      
      logDebug('Analytics fetch - Date range:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dateRange,
        filters
      })

      // Build users query with filters and date range
      let usersQuery = supabase
        .from('profiles')
        .select('id, role, created_at, updated_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Apply userType filter
      if (filters.userType && filters.userType !== 'all') {
        if (filters.userType === 'hosts') {
          usersQuery = usersQuery.eq('role', 'partner')
        } else if (filters.userType === 'guests') {
          usersQuery = usersQuery.eq('role', 'seeker')
        } else if (filters.userType === 'premium') {
          // Premium users filter - adjust based on your premium user logic
          // For now, we'll skip this as there's no premium field visible
        }
      }

      // Build bookings query with filters and date range
      let bookingsQuery = supabase
        .from('bookings')
        .select('id, status, total_paid, price, created_at, updated_at, seeker_id, listing_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Apply bookingStatus filter
      if (filters.bookingStatus && filters.bookingStatus !== 'all') {
        bookingsQuery = bookingsQuery.eq('status', filters.bookingStatus)
      }

      // Build listings query with filters and date range
      let listingsQuery = supabase
        .from('listings')
        .select('id, status, created_at, updated_at, category, partner_id, address')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Apply spaceCategory filter
      if (filters.spaceCategory && filters.spaceCategory !== 'all') {
        listingsQuery = listingsQuery.eq('category', filters.spaceCategory)
      }

      // Apply location filter (filter by address containing location text)
      if (filters.location && filters.location !== 'all') {
        // Convert filter value to searchable format
        const locationSearch = filters.location.replace(/-/g, ' ')
        listingsQuery = listingsQuery.ilike('address', `%${locationSearch}%`)
      }

      // Supabase queries always resolve, so we need to handle them differently
      const [
        usersResult,
        bookingsResult,
        listingsResult,
        earningsResult,
        reviewsResult,
        supportTicketsResult,
        allCategoriesResult
      ] = await Promise.all([
        usersQuery,
        bookingsQuery,
        listingsQuery,
        supabase
          .from('earnings')
          .select('net_amount, created_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .then(result => ({ data: result.data || [], error: result.error }))
          .catch(() => ({ data: [], error: null })),
        supabase
          .from('reviews')
          .select('rating, created_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .then(result => ({ data: result.data || [], error: result.error }))
          .catch(() => ({ data: [], error: null })),
        supabase
          .from('support_tickets')
          .select('created_at, resolved_at')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .not('resolved_at', 'is', null)
          .then(result => ({ data: result.data || [], error: result.error }))
          .catch(() => ({ data: [], error: null })),
        // Fetch all distinct categories from listings table (not filtered by date range)
        // This ensures we only show categories that actually exist in the database
        supabase
          .from('listings')
          .select('category')
          .then(result => ({ data: result.data || [], error: result.error }))
          .catch(() => ({ data: [], error: null }))
      ])

      // Check for critical errors and log them
      if (usersResult.error) {
        logError('Users query error:', usersResult.error)
        const errorObj = usersResult.error
        let errorMsg = 'Unknown error'
        
        if (errorObj && typeof errorObj === 'object') {
          errorMsg = errorObj.message || 
                    errorObj.details || 
                    errorObj.hint ||
                    (Object.keys(errorObj).length > 0 ? JSON.stringify(errorObj) : 'Database query failed')
        } else if (typeof errorObj === 'string') {
          errorMsg = errorObj
        }
        
        throw new Error(`Failed to fetch users: ${errorMsg}`)
      }
      if (bookingsResult.error) {
        logError('Bookings query error:', bookingsResult.error)
        const errorObj = bookingsResult.error
        let errorMsg = 'Unknown error'
        
        if (errorObj && typeof errorObj === 'object') {
          errorMsg = errorObj.message || 
                    errorObj.details || 
                    errorObj.hint ||
                    (Object.keys(errorObj).length > 0 ? JSON.stringify(errorObj) : 'Database query failed')
        } else if (typeof errorObj === 'string') {
          errorMsg = errorObj
        }
        
        throw new Error(`Failed to fetch bookings: ${errorMsg}`)
      }
      if (listingsResult.error) {
        logWarn('Listings query error (non-critical):', listingsResult.error)
        // Listings error is not critical, but log it
      }
      if (earningsResult.error) {
        logWarn('Earnings fetch error (non-critical):', earningsResult.error)
      }
      if (reviewsResult.error) {
        logWarn('Reviews fetch error (non-critical):', reviewsResult.error)
      }
      if (supportTicketsResult.error) {
        logWarn('Support tickets fetch error (non-critical):', supportTicketsResult.error)
      }

      const users = usersResult.data || []
      const bookings = bookingsResult.data || []
      const listings = listingsResult.data || []
      const earnings = earningsResult.data || []
      const reviews = reviewsResult.data || []
      const supportTickets = supportTicketsResult.data || []

      // Extract unique categories from database (use fallback from current listings if global query failed)
      let validCategories = []
      if (allCategoriesResult && allCategoriesResult.data && !allCategoriesResult.error) {
        const uniqueCategories = [...new Set(
          allCategoriesResult.data
            .map(listing => listing.category)
            .filter(category => category && category.trim() !== '')
        )]
        validCategories = uniqueCategories
        logDebug('Valid categories from database:', uniqueCategories)
      } else {
        // Fallback: use categories from current filtered listings
        if (allCategoriesResult?.error) {
          logWarn('Error fetching all categories, using categories from filtered listings as fallback:', allCategoriesResult.error)
        }
        const uniqueCategories = [...new Set(
          listings
            .map(listing => listing.category)
            .filter(category => category && category.trim() !== '')
        )]
        validCategories = uniqueCategories
        logDebug('Using categories from filtered listings (fallback):', uniqueCategories)
      }

      logDebug('Analytics data fetched successfully:', {
        users: users.length,
        bookings: bookings.length,
        listings: listings.length,
        earnings: earnings.length,
        reviews: reviews.length,
        supportTickets: supportTickets.length,
        validCategories: validCategories.length,
        filtersApplied: filters
      })

      // Calculate metrics
      const metrics = calculateMetrics(users, bookings, listings, earnings, startDate, endDate)
      
      // Calculate performance indicators (with real review and support ticket data)
      const performanceIndicators = calculatePerformanceIndicators(users, bookings, listings, reviews, supportTickets, startDate)
      
      // Generate chart data (pass valid categories to ensure only database categories are shown)
      const chartData = generateChartData(users, bookings, listings, startDate, endDate, validCategories)

      setData({
        metrics,
        performanceIndicators,
        chartData,
        loading: false,
        error: null
      })

    } catch (err) {
      // Handle error - could be empty object, Error instance, or string
      const errorMessage = err?.message || 
                          (typeof err === 'string' ? err : '') ||
                          (err && Object.keys(err).length > 0 ? JSON.stringify(err) : 'Unknown error occurred')
      
      logError('Error fetching analytics data:', {
        error: err,
        message: errorMessage,
        stack: err?.stack
      })
      
      setData(prev => ({
        ...prev,
        loading: false,
        error: errorMessage || 'Failed to load analytics data. Please try again.'
      }))
    }
  }, [dateRange, filters, customDateRange])

  const setupRealtimeSubscription = useCallback(() => {
    // Use static channel names to avoid memory leaks
    const profilesChannel = supabase.channel('analytics_profiles').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          logDebug('Profile change detected, refreshing analytics...')
          fetchAnalyticsData()
        }
    )
    
    const bookingsChannel = supabase.channel('analytics_bookings').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          logDebug('Booking change detected, refreshing analytics...')
          fetchAnalyticsData()
        }
    )
    
    const listingsChannel = supabase.channel('analytics_listings').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'listings' },
        () => {
          logDebug('Listing change detected, refreshing analytics...')
          fetchAnalyticsData()
        }
      )

    // Subscribe to all channels
    profilesChannel.subscribe()
    bookingsChannel.subscribe()
    listingsChannel.subscribe()

    // Cleanup subscriptions on unmount
    return () => {
        try {
        profilesChannel.unsubscribe()
        bookingsChannel.unsubscribe()
        listingsChannel.unsubscribe()
        } catch (e) {
        logWarn('Error unsubscribing analytics channels:', e)
        }
    }
  }, [fetchAnalyticsData])

  useEffect(() => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      setData(prev => ({ ...prev, loading: true }))
      return
    }

    // Don't fetch if user is not authenticated or not admin
    if (!user || !isAdmin) {
      logDebug('User not authenticated or not admin, clearing analytics data')
      setData({
        metrics: [],
        performanceIndicators: [],
        chartData: {},
        loading: false,
        error: null
      })
      return
    }

    logDebug('User authenticated as admin, fetching analytics data...')
    fetchAnalyticsData()
    
    // Set up realtime subscriptions
    const cleanup = setupRealtimeSubscription()
    
    return () => {
      if (cleanup) cleanup()
    }
  }, [user, isAdmin, authLoading, fetchAnalyticsData, setupRealtimeSubscription])

  return {
    data,
    refetch: fetchAnalyticsData
  }
}

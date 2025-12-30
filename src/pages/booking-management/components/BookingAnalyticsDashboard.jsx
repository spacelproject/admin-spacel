import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';
import { formatCurrency } from '../../../utils/currency';

const BookingAnalyticsDashboard = ({ filters = {} }) => {
  const [timeRange, setTimeRange] = useState('30days');
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    revenueTrends: [],
    bookingTrends: [],
    cancellationRate: 0,
    averageBookingValue: 0,
    totalRevenue: 0,
    totalBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    completedBookings: 0
  });

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange, filters]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const now = new Date();
      let startDate;

      if (timeRange === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeRange === '30days') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (timeRange === '90days') {
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Build query with filters
      let query = supabase
        .from('bookings')
        .select(`
          id,
          status,
          total_paid,
          price,
          service_fee,
          payment_processing_fee,
          created_at,
          start_time,
          end_time
        `)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Apply status filter if provided
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data: bookingsData, error } = await query;

      if (error) throw error;

      // Calculate metrics
      const totalBookings = bookingsData?.length || 0;
      const confirmedBookings = bookingsData?.filter(b => b.status === 'confirmed').length || 0;
      const cancelledBookings = bookingsData?.filter(b => b.status === 'cancelled').length || 0;
      const completedBookings = bookingsData?.filter(b => b.status === 'completed').length || 0;

      const totalRevenue = bookingsData?.reduce((sum, booking) => {
        const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0;
        return sum + amount;
      }, 0) || 0;

      const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;
      const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

      // Calculate revenue trends
      const revenueTrends = calculateRevenueTrends(bookingsData, timeRange);

      // Calculate booking trends
      const bookingTrends = calculateBookingTrends(bookingsData, timeRange);

      setAnalytics({
        revenueTrends,
        bookingTrends,
        cancellationRate: Math.round(cancellationRate * 100) / 100,
        averageBookingValue: Math.round(averageBookingValue * 100) / 100,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        completedBookings
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRevenueTrends = (bookings, range) => {
    if (!bookings || bookings.length === 0) return [];

    const now = new Date();
    let periods = [];

    if (range === '7days') {
      // Daily for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const dayBookings = bookings.filter(booking => {
          const bookingDate = new Date(booking.created_at);
          return bookingDate >= dayStart && bookingDate < dayEnd;
        });

        const revenue = dayBookings.reduce((sum, booking) => {
          const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0;
          return sum + amount;
        }, 0);

        periods.push({
          period: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: Math.round(revenue * 100) / 100
        });
      }
    } else if (range === '30days') {
      // Weekly for last 30 days
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

        const weekBookings = bookings.filter(booking => {
          const bookingDate = new Date(booking.created_at);
          return bookingDate >= weekStart && bookingDate < weekEnd;
        });

        const revenue = weekBookings.reduce((sum, booking) => {
          const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0;
          return sum + amount;
        }, 0);

        periods.push({
          period: `Week ${4 - i}`,
          revenue: Math.round(revenue * 100) / 100
        });
      }
    } else if (range === '90days') {
      // Monthly for last 90 days (3 months)
      for (let i = 2; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const monthBookings = bookings.filter(booking => {
          const bookingDate = new Date(booking.created_at);
          return bookingDate >= monthStart && bookingDate < monthEnd;
        });

        const revenue = monthBookings.reduce((sum, booking) => {
          const amount = parseFloat(booking.total_paid) || parseFloat(booking.price) || 0;
          return sum + amount;
        }, 0);

        periods.push({
          period: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: Math.round(revenue * 100) / 100
        });
      }
    }

    return periods;
  };

  const calculateBookingTrends = (bookings, range) => {
    if (!bookings || bookings.length === 0) return [];

    const now = new Date();
    let periods = [];

    if (range === '7days') {
      // Daily for last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const dayBookings = bookings.filter(booking => {
          const bookingDate = new Date(booking.created_at);
          return bookingDate >= dayStart && bookingDate < dayEnd;
        });

        periods.push({
          period: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          bookings: dayBookings.length,
          confirmed: dayBookings.filter(b => b.status === 'confirmed').length,
          cancelled: dayBookings.filter(b => b.status === 'cancelled').length
        });
      }
    } else if (range === '30days') {
      // Weekly for last 30 days
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

        const weekBookings = bookings.filter(booking => {
          const bookingDate = new Date(booking.created_at);
          return bookingDate >= weekStart && bookingDate < weekEnd;
        });

        periods.push({
          period: `Week ${4 - i}`,
          bookings: weekBookings.length,
          confirmed: weekBookings.filter(b => b.status === 'confirmed').length,
          cancelled: weekBookings.filter(b => b.status === 'cancelled').length
        });
      }
    } else if (range === '90days') {
      // Monthly for last 90 days
      for (let i = 2; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

        const monthBookings = bookings.filter(booking => {
          const bookingDate = new Date(booking.created_at);
          return bookingDate >= monthStart && bookingDate < monthEnd;
        });

        periods.push({
          period: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          bookings: monthBookings.length,
          confirmed: monthBookings.filter(b => b.status === 'confirmed').length,
          cancelled: monthBookings.filter(b => b.status === 'cancelled').length
        });
      }
    }

    return periods;
  };

  const maxRevenue = Math.max(...analytics.revenueTrends.map(t => t.revenue), 0);
  const maxBookings = Math.max(...analytics.bookingTrends.map(t => t.bookings), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground">Booking Analytics</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              timeRange === '7days'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            7 Days
          </button>
          <button
            onClick={() => setTimeRange('30days')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              timeRange === '30days'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            30 Days
          </button>
          <button
            onClick={() => setTimeRange('90days')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              timeRange === '90days'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {formatCurrency(analytics.totalRevenue)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-accent/10">
              <Icon name="DollarSign" size={20} className="text-accent" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Bookings</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {analytics.totalBookings}
              </p>
            </div>
            <div className="p-3 rounded-full bg-primary/10">
              <Icon name="Calendar" size={20} className="text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cancellation Rate</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {analytics.cancellationRate}%
              </p>
            </div>
            <div className="p-3 rounded-full bg-destructive/10">
              <Icon name="XCircle" size={20} className="text-destructive" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Booking Value</p>
              <p className="text-2xl font-semibold text-foreground mt-1">
                {formatCurrency(analytics.averageBookingValue)}
              </p>
            </div>
            <div className="p-3 rounded-full bg-success/10">
              <Icon name="TrendingUp" size={20} className="text-success" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trends Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Revenue Trends</h3>
        <div className="space-y-2">
          {analytics.revenueTrends.map((trend, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-24 text-sm text-muted-foreground">{trend.period}</div>
              <div className="flex-1 relative">
                <div className="h-8 bg-muted rounded-md overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300 flex items-center justify-end pr-2"
                    style={{ width: `${maxRevenue > 0 ? (trend.revenue / maxRevenue) * 100 : 0}%` }}
                  >
                    {trend.revenue > 0 && (
                      <span className="text-xs font-medium text-primary-foreground">
                        {formatCurrency(trend.revenue)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Trends Chart */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Booking Trends</h3>
        <div className="space-y-2">
          {analytics.bookingTrends.map((trend, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-24 text-sm text-muted-foreground">{trend.period}</div>
              <div className="flex-1 relative">
                <div className="h-8 bg-muted rounded-md overflow-hidden flex">
                  <div
                    className="h-full bg-success transition-all duration-300 flex items-center justify-end pr-1"
                    style={{ width: `${maxBookings > 0 ? (trend.confirmed / maxBookings) * 100 : 0}%` }}
                  />
                  <div
                    className="h-full bg-destructive transition-all duration-300"
                    style={{ width: `${maxBookings > 0 ? (trend.cancelled / maxBookings) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="w-32 text-xs text-muted-foreground text-right">
                {trend.bookings} total ({trend.confirmed} confirmed, {trend.cancelled} cancelled)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BookingAnalyticsDashboard;


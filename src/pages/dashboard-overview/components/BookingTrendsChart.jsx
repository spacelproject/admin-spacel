import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { saveAs } from 'file-saver/dist/FileSaver';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { useBookingTrends } from '../../../hooks/useBookingTrends';

const BookingTrendsChart = () => {
  const [timeRange, setTimeRange] = useState('7days');
  const { data, loading, error, stats } = useBookingTrends(timeRange);

  // Calculate change and percentage for display
  const { currentValue, change, percentage } = useMemo(() => {
    if (!data || data.length === 0) return { currentValue: 0, change: 0, percentage: 0 };
    
    const current = data[data.length - 1];
    const previous = data.length > 1 ? data[data.length - 2] : data[0];
    
    const currentVal = current?.revenue || 0;
    const previousVal = previous?.revenue || 0;
    const changeAmount = currentVal - previousVal;
    const percent = previousVal > 0 ? ((changeAmount / previousVal) * 100) : 0;
    
    return {
      currentValue: currentVal,
      change: changeAmount,
      percentage: percent
    };
  }, [data]);

  const timeRangeOptions = [
    { value: '7days', label: '7 Days' },
    { value: '30days', label: '30 Days' },
    { value: 'monthly', label: 'Monthly' }
  ];

  const handleExportData = () => {
    try {
      const exportData = data?.map((item) => ({
        Period: item?.name,
        'Total Bookings': item?.bookings,
        'Revenue ($)': item?.revenue
      }));

      // Convert to CSV format
      const headers = Object.keys(exportData?.[0] || {});
      const csvContent = [
        headers?.join(','),
        ...exportData?.map(row => headers?.map(header => row?.[header])?.join(','))
      ]?.join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `booking-trends-${timeRange}-${new Date()?.toISOString()?.split('T')?.[0]}.csv`;
      saveAs(blob, fileName);

      console.log('✅ Booking trends data exported successfully');
    } catch (error) {
      console.error('❌ Error exporting booking trends data:', error);
      // In a real app, you would show a toast notification for the error
    }
  };

  // Custom Tooltip Component for Area/Line Chart
  const CustomAreaTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0];
      const value = dataPoint.value || 0;
      const index = data?.findIndex(item => item.name === label);
      const previousItem = index > 0 && data?.[index - 1];
      const previousValue = previousItem?.revenue || 0;
      const changeAmount = value - previousValue;
      const changePercent = previousValue > 0 ? ((changeAmount / previousValue) * 100) : 0;
      
      // Format date and time
      const formatDateTime = (labelStr) => {
        if (!labelStr) return '';
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayIndex = days.findIndex(d => d === labelStr);
        
        if (dayIndex !== -1) {
          const today = new Date();
          for (let i = 0; i < 7; i++) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            if (date.getDay() === dayIndex) {
              const dayName = days[dayIndex];
              // Use a default time like 10:00 AM
              return `${dayName}, 10:00 AM`;
            }
          }
        }
        
        return labelStr;
      };

      const displayDateTime = formatDateTime(label);
      const formattedValue = `$${value.toLocaleString()}`;
      const formattedPercent = `${changePercent >= 0 ? '+' : ''}${Math.abs(changePercent).toFixed(0)}%`;

      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[180px]">
          <div className="mb-2">
            <p className="text-xs font-medium text-gray-500 mb-1">{displayDateTime}</p>
            <p className="text-2xl font-bold text-gray-900">{formattedValue}</p>
          </div>
          <div className="flex items-center space-x-1">
            <Icon 
              name="TrendingUp" 
              size={12} 
              className="text-green-600"
            />
            <span className="text-sm font-semibold text-green-600">{formattedPercent}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 card-shadow h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Sales Overview</h3>
          <div className="flex items-center space-x-2 mt-1">
            <p className={`text-sm font-semibold ${percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {percentage >= 0 ? '+' : ''}{percentage.toFixed(1)}%
            </p>
            {percentage >= 0 && (
              <Icon name="TrendingUp" size={14} className="text-green-600" />
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {timeRangeOptions?.map((option) => (
              <button
                key={option?.value}
                onClick={() => setTimeRange(option?.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-smooth ${
                  timeRange === option?.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {option?.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="h-96">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Icon name="AlertCircle" size={24} className="text-red-500 mx-auto mb-2" />
              <p className="text-sm font-semibold text-red-600 mb-1">Failed to load chart data</p>
              <p className="text-xs font-normal text-gray-500">{error}</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="strokeRevenue" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b' }}
              />
              <YAxis 
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b' }}
                tickFormatter={(value) => {
                  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                  return `$${value}`;
                }}
              />
              <Tooltip content={<CustomAreaTooltip />} />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="url(#strokeRevenue)"
                strokeWidth={3}
                fill="url(#colorRevenue)"
                dot={false}
                activeDot={{ r: 6, fill: '#60a5fa', stroke: '#ffffff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
};

export default BookingTrendsChart;
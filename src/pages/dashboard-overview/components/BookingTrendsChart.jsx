import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { saveAs } from 'file-saver/dist/FileSaver';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const BookingTrendsChart = () => {
  const [chartType, setChartType] = useState('line');
  const [timeRange, setTimeRange] = useState('7days');

  const data = [
    { name: 'Mon', bookings: 24, revenue: 2400 },
    { name: 'Tue', bookings: 32, revenue: 3200 },
    { name: 'Wed', bookings: 28, revenue: 2800 },
    { name: 'Thu', bookings: 45, revenue: 4500 },
    { name: 'Fri', bookings: 52, revenue: 5200 },
    { name: 'Sat', bookings: 38, revenue: 3800 },
    { name: 'Sun', bookings: 29, revenue: 2900 }
  ];

  const monthlyData = [
    { name: 'Jan', bookings: 420, revenue: 42000 },
    { name: 'Feb', bookings: 380, revenue: 38000 },
    { name: 'Mar', bookings: 520, revenue: 52000 },
    { name: 'Apr', bookings: 480, revenue: 48000 },
    { name: 'May', bookings: 620, revenue: 62000 },
    { name: 'Jun', bookings: 580, revenue: 58000 },
    { name: 'Jul', bookings: 650, revenue: 65000 }
  ];

  const getCurrentData = () => {
    return timeRange === '7days' ? data : monthlyData;
  };

  const timeRangeOptions = [
    { value: '7days', label: '7 Days' },
    { value: '30days', label: '30 Days' }
  ];

  const handleExportData = () => {
    try {
      const currentData = getCurrentData();
      const exportData = currentData?.map((item) => ({
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

  return (
    <div className="bg-card border border-border rounded-lg p-6 card-shadow">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-card-foreground">Booking Trends</h3>
        <div className="flex items-center space-x-2">
          <div className="flex bg-muted rounded-md p-1">
            {timeRangeOptions?.map((option) => (
              <button
                key={option?.value}
                onClick={() => setTimeRange(option?.value)}
                className={`px-3 py-1 text-sm rounded transition-smooth ${
                  timeRange === option?.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option?.label}
              </button>
            ))}
          </div>
          <div className="flex bg-muted rounded-md p-1">
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded transition-smooth ${
                chartType === 'line' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name="TrendingUp" size={16} />
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded transition-smooth ${
                chartType === 'bar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon name="BarChart3" size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={getCurrentData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="bookings" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
              />
            </LineChart>
          ) : (
            <BarChart data={getCurrentData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="name" 
                stroke="#64748b"
                fontSize={12}
              />
              <YAxis 
                stroke="#64748b"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey="bookings" 
                fill="#2563eb"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary rounded-full"></div>
            <span className="text-sm text-muted-foreground">Bookings</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          iconName="Download" 
          iconPosition="left"
          onClick={handleExportData}
        >
          Export Data
        </Button>
      </div>
    </div>
  );
};

export default BookingTrendsChart;
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Icon from '../../../components/AppIcon';

import Select from '../../../components/ui/Select';

const RevenueChart = ({ monthlyData: realMonthlyData }) => {
  const [chartType, setChartType] = useState('line');
  const [timeRange, setTimeRange] = useState('month');

  // Calculate real data for all time ranges
  const calculateTimeRangeData = () => {
    if (!realMonthlyData || realMonthlyData.length === 0) {
      return {
        monthlyData: [],
        weeklyData: [],
        dailyData: []
      };
    }

    // Build a YYYY-MM -> data map from provided monthly data
    const monthToData = new Map(
      realMonthlyData.map(item => [
        item.month,
        {
          revenue: Number(item.revenue) || 0,
          transactions: Number(item.transactions) || 0,
          avgRate: Number(item.avgCommissionRate) || 0
        }
      ])
    )

    // Generate the last 12 months including the current month, padding missing months with zeros
    const now = new Date()
    const monthsPadded = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const data = monthToData.get(key) || { revenue: 0, transactions: 0, avgRate: 0 }
      monthsPadded.push({
        period: key,
        revenue: data.revenue,
        transactions: data.transactions,
        avgRate: data.avgRate
      })
    }

    const monthlyData = monthsPadded

    // Calculate weekly data from monthly data (simplified - distribute monthly data across weeks)
    const weeklyData = [];
    monthlyData.forEach(month => {
      const weeksInMonth = 4; // Simplified assumption
      const weeklyRevenue = month.revenue / weeksInMonth;
      const weeklyTransactions = Math.round((month.transactions || 0) / weeksInMonth);
      
      for (let week = 1; week <= weeksInMonth; week++) {
        weeklyData.push({
          period: `Week ${week}`,
          revenue: Math.round(weeklyRevenue),
          transactions: weeklyTransactions,
          avgRate: month.avgRate
        });
      }
    });

    // Calculate daily data from monthly data (simplified - distribute monthly data across days)
    const dailyData = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const daysInWeek = 7;
    
    monthlyData.forEach(month => {
      const dailyRevenue = month.revenue / (daysInWeek * 4); // 4 weeks per month
      const dailyTransactions = Math.round((month.transactions || 0) / (daysInWeek * 4));
      
      dayNames.forEach(day => {
        dailyData.push({
          period: day,
          revenue: Math.round(dailyRevenue),
          transactions: dailyTransactions,
          avgRate: month.avgRate
        });
      });
    });

    return { monthlyData, weeklyData, dailyData };
  };

  const { monthlyData, weeklyData, dailyData } = calculateTimeRangeData();

  const getChartData = () => {
    switch (timeRange) {
      case 'week':
        return weeklyData;
      case 'day':
        return dailyData;
      default:
        return monthlyData;
    }
  };

  const timeRangeOptions = [
    { value: 'day', label: 'Last 7 Days' },
    { value: 'week', label: 'Last 4 Weeks' },
    { value: 'month', label: 'Last 12 Months' }
  ];

  const chartTypeOptions = [
    { value: 'line', label: 'Line Chart' },
    { value: 'bar', label: 'Bar Chart' }
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-semibold text-gray-900">
                {entry.dataKey === 'revenue' ? formatCurrency(entry.value) : entry.value}
                {entry.dataKey === 'avgRate' && '%'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const chartData = getChartData();
  const hasData = Array.isArray(chartData) && chartData.length > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Revenue Trends</h2>
          <p className="text-sm text-gray-500 mt-1">Track your commission revenue over time</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select
            options={timeRangeOptions}
            value={timeRange}
            onChange={setTimeRange}
            className="w-40"
          />
          <Select
            options={chartTypeOptions}
            value={chartType}
            onChange={setChartType}
            className="w-32"
          />
        </div>
      </div>

      {/* Chart */}
      <div className="h-80 mb-6 bg-gray-50/50 rounded-lg p-4">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No data available for the selected range
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="period" 
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
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#2563EB" 
                strokeWidth={2}
                dot={{ fill: '#2563EB', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#2563EB', strokeWidth: 2 }}
                name="Revenue"
              />
              </LineChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="period" 
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
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="revenue" 
                fill="#2563EB"
                name="Revenue"
                radius={[4, 4, 0, 0]}
              />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-5 border border-blue-200/50">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Icon name="TrendingUp" size={16} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency((chartData || []).reduce((sum, item) => sum + (Number(item.revenue) || 0), 0))}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100/50 rounded-lg p-5 border border-green-200/50">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
              <Icon name="BarChart3" size={16} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">Avg. Revenue</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(((chartData || []).reduce((sum, item) => sum + (Number(item.revenue) || 0), 0)) / (chartData?.length || 1))}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-5 border border-purple-200/50">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
              <Icon name="Percent" size={16} className="text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700">Avg. Commission</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {((((chartData || []).reduce((sum, item) => sum + (Number(item.avgRate) || 0), 0)) / (chartData?.length || 1)) || 0).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
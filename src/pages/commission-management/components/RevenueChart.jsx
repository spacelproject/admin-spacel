import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Icon from '../../../components/AppIcon';

import Select from '../../../components/ui/Select';

const RevenueChart = () => {
  const [chartType, setChartType] = useState('line');
  const [timeRange, setTimeRange] = useState('month');

  // Mock revenue data
  const monthlyData = [
    { period: 'Jan', revenue: 32400, transactions: 245, avgRate: 14.2 },
    { period: 'Feb', revenue: 28900, transactions: 198, avgRate: 14.8 },
    { period: 'Mar', revenue: 35600, transactions: 267, avgRate: 15.1 },
    { period: 'Apr', revenue: 41200, transactions: 312, avgRate: 15.3 },
    { period: 'May', revenue: 38800, transactions: 289, avgRate: 14.9 },
    { period: 'Jun', revenue: 45200, transactions: 334, avgRate: 15.5 },
    { period: 'Jul', revenue: 52100, transactions: 378, avgRate: 15.8 },
    { period: 'Aug', revenue: 48900, transactions: 356, avgRate: 15.2 },
    { period: 'Sep', revenue: 44700, transactions: 321, avgRate: 15.0 },
    { period: 'Oct', revenue: 39800, transactions: 298, avgRate: 14.7 },
    { period: 'Nov', revenue: 42300, transactions: 315, avgRate: 15.1 },
    { period: 'Dec', revenue: 45280, transactions: 342, avgRate: 15.2 }
  ];

  const weeklyData = [
    { period: 'Week 1', revenue: 11200, transactions: 85, avgRate: 15.1 },
    { period: 'Week 2', revenue: 12800, transactions: 92, avgRate: 15.3 },
    { period: 'Week 3', revenue: 10900, transactions: 78, avgRate: 14.8 },
    { period: 'Week 4', revenue: 10380, transactions: 87, avgRate: 15.2 }
  ];

  const dailyData = [
    { period: 'Mon', revenue: 1850, transactions: 14, avgRate: 15.2 },
    { period: 'Tue', revenue: 2100, transactions: 16, avgRate: 15.1 },
    { period: 'Wed', revenue: 1920, transactions: 13, avgRate: 15.4 },
    { period: 'Thu', revenue: 2340, transactions: 18, avgRate: 15.0 },
    { period: 'Fri', revenue: 2680, transactions: 21, avgRate: 14.9 },
    { period: 'Sat', revenue: 1890, transactions: 15, avgRate: 15.3 },
    { period: 'Sun', revenue: 1600, transactions: 12, avgRate: 15.1 }
  ];

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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-modal">
          <p className="text-sm font-medium text-card-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium text-card-foreground">
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

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-card-foreground">Revenue Trends</h2>
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
      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis 
                dataKey="period" 
                stroke="var(--color-muted-foreground)"
                fontSize={12}
              />
              <YAxis 
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="var(--color-primary)" 
                strokeWidth={2}
                dot={{ fill: 'var(--color-primary)', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: 'var(--color-primary)', strokeWidth: 2 }}
                name="Revenue"
              />
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis 
                dataKey="period" 
                stroke="var(--color-muted-foreground)"
                fontSize={12}
              />
              <YAxis 
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="revenue" 
                fill="var(--color-primary)"
                name="Revenue"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="TrendingUp" size={16} className="text-success" />
            <span className="text-sm font-medium text-card-foreground">Total Revenue</span>
          </div>
          <p className="text-lg font-bold text-card-foreground">
            {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0))}
          </p>
        </div>

        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="BarChart3" size={16} className="text-primary" />
            <span className="text-sm font-medium text-card-foreground">Avg. Revenue</span>
          </div>
          <p className="text-lg font-bold text-card-foreground">
            {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0) / chartData.length)}
          </p>
        </div>

        <div className="bg-muted rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Percent" size={16} className="text-accent" />
            <span className="text-sm font-medium text-card-foreground">Avg. Commission</span>
          </div>
          <p className="text-lg font-bold text-card-foreground">
            {(chartData.reduce((sum, item) => sum + item.avgRate, 0) / chartData.length).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;
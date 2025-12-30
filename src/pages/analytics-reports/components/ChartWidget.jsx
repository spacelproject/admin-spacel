import React, { useMemo, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Icon from '../../../components/AppIcon';

const ChartWidget = ({ title, type, data }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const colors = ['#2563EB', '#059669', '#DC2626', '#D97706', '#7C3AED', '#DB2777'];

  // Calculate percentage change for User Growth Trends
  const { percentage } = useMemo(() => {
    if (title !== 'User Growth Trends' || !data || data.length < 2) {
      return { percentage: 0 };
    }
    
    const current = data[data.length - 1]?.value || 0;
    const previous = data[data.length - 2]?.value || 0;
    const percent = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    
    return { percentage: percent };
  }, [title, data]);

  // Calculate total revenue and percentages for Revenue by Category
  const revenueStats = useMemo(() => {
    if (title !== 'Revenue by Category' || !data || data.length === 0) {
      return { total: 0, categories: [] };
    }
    
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    const categories = data.map((item, index) => ({
      ...item,
      percentage: total > 0 ? ((item.value || 0) / total) * 100 : 0,
      color: colors[index % colors.length],
      index
    })).sort((a, b) => b.value - a.value);
    
    return { total, categories };
  }, [title, data, colors]);

  // Create 3D gradients for pie chart slices
  const pieGradients = useMemo(() => {
    if (title !== 'Revenue by Category') return [];
    
    return colors.map((color, index) => {
      // Extract RGB values for gradient
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };
      
      const rgb = hexToRgb(color);
      if (!rgb) {
        return {
          id: `pieGradient${index}`,
          original: color
        };
      }
      
      // Create lighter and darker shades for gradient
      const lighter = `rgb(${Math.min(255, rgb.r + 50)}, ${Math.min(255, rgb.g + 50)}, ${Math.min(255, rgb.b + 50)})`;
      const darker = `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;
      
      return {
        id: `pieGradient${index}`,
        lighter,
        darker,
        original: color
      };
    });
  }, [title, colors]);

  // Custom Tooltip for Weekly Booking Trends (Bar Chart) - matches orders chart design
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value || 0;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[120px]">
          <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Space Performance (Area Chart) - matches revenue chart design with light green
  const CustomSpacePerformanceTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value || 0;
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg shadow-lg p-3 min-w-[180px]">
          <p className="text-xs font-medium text-gray-600 mb-1">Space Performance in {label}</p>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Revenue by Category Pie Chart
  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0];
      const value = dataPoint.value || 0;
      const name = dataPoint.name || '';
      const total = revenueStats.total;
      const percentage = total > 0 ? ((value / total) * 100) : 0;
      
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[150px]">
          <div className="flex items-center space-x-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: dataPoint.payload.fill }}
            />
            <p className="text-sm font-semibold text-gray-900">{name}</p>
          </div>
          <p className="text-xl font-bold text-gray-900">${value.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">{percentage.toFixed(1)}% of total</p>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for User Growth Trends (Area Chart)
  const CustomAreaTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0];
      const value = dataPoint.value || 0;
      const index = data?.findIndex(item => item.name === label);
      const previousItem = index > 0 && data?.[index - 1];
      const previousValue = previousItem?.value || 0;
      const changeAmount = value - previousValue;
      const changePercent = previousValue > 0 ? ((changeAmount / previousValue) * 100) : 0;
      
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[180px]">
          <div className="mb-2">
            <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          </div>
          <div className="flex items-center space-x-1">
            <Icon 
              name={changePercent >= 0 ? "TrendingUp" : "TrendingDown"} 
              size={12} 
              className={changePercent >= 0 ? "text-green-600" : "text-red-600"}
            />
            <span className={`text-sm font-semibold ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changePercent >= 0 ? '+' : ''}{Math.abs(changePercent).toFixed(0)}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    // Special rendering for User Growth Trends - use Area Chart with gradient
    if (title === 'User Growth Trends' && type === 'line') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <defs>
              <linearGradient id="colorUserGrowth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
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
            />
            <Tooltip content={<CustomAreaTooltip />} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6"
              strokeWidth={3}
              fill="url(#colorUserGrowth)"
              dot={false}
              activeDot={{ r: 6, fill: '#60a5fa', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    switch (type) {
      case 'line':
        // Special rendering for Space Performance - match the revenue area chart design
        if (title === 'Space Performance') {
          return (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorSpacePerformance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                />
                <Tooltip content={<CustomSpacePerformanceTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fill="url(#colorSpacePerformance)"
                  dot={{ fill: '#1e40af', r: 4 }}
                  activeDot={{ r: 6, fill: '#1e40af', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          );
        }
        
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
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
              />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'bar':
        // Special rendering for Weekly Booking Trends - match the orange bar chart design
        if (title === 'Weekly Booking Trends') {
          return (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
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
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="#f97316"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          );
        }
        
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
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
              />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#2563EB" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'pie':
        // Special modern rendering for Revenue by Category - centered donut with legend below
        if (title === 'Revenue by Category') {
          const { total, categories } = revenueStats;
          
          // Custom label function - shows inside by default, outside on hover with line
          const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, index: labelIndex }) => {
            const RADIAN = Math.PI / 180;
            
            // If this segment is hovered, show label outside with connecting line
            if (activeIndex === labelIndex) {
              const labelRadius = outerRadius + 30;
              const labelX = cx + labelRadius * Math.cos(-midAngle * RADIAN);
              const labelY = cy + labelRadius * Math.sin(-midAngle * RADIAN);
              
              // Calculate line points
              const lineStartX = cx + outerRadius * Math.cos(-midAngle * RADIAN);
              const lineStartY = cy + outerRadius * Math.sin(-midAngle * RADIAN);
              const lineEndX = cx + (outerRadius + 20) * Math.cos(-midAngle * RADIAN);
              const lineEndY = cy + (outerRadius + 20) * Math.sin(-midAngle * RADIAN);
              
              return (
                <g>
                  {/* Connecting line */}
                  <line
                    x1={lineStartX}
                    y1={lineStartY}
                    x2={lineEndX}
                    y2={lineEndY}
                    stroke="#6b7280"
                    strokeWidth={1.5}
                    fill="none"
                  />
                  {/* Outside label */}
                  <text
                    x={labelX}
                    y={labelY}
                    fill="#1f2937"
                    textAnchor={labelX > cx ? 'start' : 'end'}
                    dominantBaseline="middle"
                    fontSize={13}
                    fontWeight="600"
                    className="pointer-events-none"
                  >
                    {`${name}: ${(percent * 100).toFixed(0)}%`}
                  </text>
                </g>
              );
            }
            
            // Default: show percentage inside the chart
            if (percent < 0.05) return null; // Don't show labels for very small segments
            
            const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
            const x = cx + radius * Math.cos(-midAngle * RADIAN);
            const y = cy + radius * Math.sin(-midAngle * RADIAN);
            
            return (
              <text
                x={x}
                y={y}
                fill="white"
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={13}
                fontWeight="700"
                className="pointer-events-none"
                style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}
              >
                {`${(percent * 100).toFixed(0)}%`}
              </text>
            );
          };
          
          // Better color palette matching the design
          const chartColors = ['#06b6d4', '#f97316', '#ec4899', '#a855f7', '#3b82f6', '#10b981'];
          
          return (
            <div className="flex flex-col items-center space-y-6">
              {/* Donut Chart Section */}
              <div className="relative w-full max-w-[320px] mx-auto">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderLabel}
                      outerRadius={120}
                      innerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                      activeIndex={activeIndex}
                      activeShape={{ outerRadius: 125 }}
                    >
                      {data.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={chartColors[index % chartColors.length]}
                          style={{
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            opacity: activeIndex !== null && activeIndex !== index ? 0.7 : 1
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center label showing total - matching the design */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-sm font-medium text-gray-400 mb-1">Total Revenue</p>
                  <p className="text-3xl font-bold text-blue-700">${total.toLocaleString()}</p>
                </div>
              </div>

              {/* Legend Section */}
              {data && data.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
                  {data.map((entry, index) => (
                    <div 
                      key={entry.name || `category-${index}`}
                      className="flex items-center space-x-2"
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: chartColors[index % chartColors.length] }}
                      />
                      <span className="text-sm font-medium text-gray-700">{entry.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        }
        
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return <div className="h-64 flex items-center justify-center text-muted-foreground">No chart data available</div>;
    }
  };

  // Special header for User Growth Trends
  const renderHeader = () => {
    if (title === 'User Growth Trends') {
      return (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 tracking-tight">{title}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <p className={`text-sm font-semibold ${percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {percentage >= 0 ? '+' : ''}{percentage.toFixed(1)}%
                </p>
                {percentage >= 0 && (
                  <Icon name="TrendingUp" size={14} className="text-green-600" />
                )}
                {percentage < 0 && (
                  <Icon name="TrendingDown" size={14} className="text-red-600" />
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 tracking-tight">{title}</h3>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg card-shadow">
      {renderHeader()}
      
      <div className={title === 'Revenue by Category' ? 'p-8' : 'p-4'}>
        {renderChart()}
      </div>
    </div>
  );
};

export default ChartWidget;
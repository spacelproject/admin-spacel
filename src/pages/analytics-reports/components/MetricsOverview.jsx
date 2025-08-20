import React from 'react';
import Icon from '../../../components/AppIcon';

const MetricsOverview = ({ metrics }) => {
  const getMetricIcon = (type) => {
    const icons = {
      users: 'Users',
      bookings: 'Calendar',
      revenue: 'DollarSign',
      spaces: 'Building'
    };
    return icons[type] || 'TrendingUp';
  };

  const getMetricColor = (type) => {
    const colors = {
      users: 'text-blue-600',
      bookings: 'text-green-600',
      revenue: 'text-purple-600',
      spaces: 'text-orange-600'
    };
    return colors[type] || 'text-gray-600';
  };

  const getMetricBg = (type) => {
    const backgrounds = {
      users: 'bg-blue-50',
      bookings: 'bg-green-50',
      revenue: 'bg-purple-50',
      spaces: 'bg-orange-50'
    };
    return backgrounds[type] || 'bg-gray-50';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric) => (
        <div key={metric.id} className="bg-card border border-border rounded-lg p-6 card-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${getMetricBg(metric.type)}`}>
              <Icon 
                name={getMetricIcon(metric.type)} 
                size={24} 
                className={getMetricColor(metric.type)}
              />
            </div>
            <div className={`flex items-center space-x-1 text-sm ${
              metric.change >= 0 ? 'text-success' : 'text-destructive'
            }`}>
              <Icon 
                name={metric.change >= 0 ? 'TrendingUp' : 'TrendingDown'} 
                size={16} 
              />
              <span>{Math.abs(metric.change)}%</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-1">
              {metric.value}
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              {metric.label}
            </p>
            <p className="text-xs text-muted-foreground">
              {metric.period}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MetricsOverview;
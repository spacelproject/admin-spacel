import React from 'react';
import Icon from '../../../components/AppIcon';

const PerformanceIndicators = ({ indicators }) => {
  const getIndicatorColor = (status) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600 bg-green-50';
      case 'good':
        return 'text-blue-600 bg-blue-50';
      case 'average':
        return 'text-yellow-600 bg-yellow-50';
      case 'poor':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'excellent':
        return 'TrendingUp';
      case 'good':
        return 'ArrowUp';
      case 'average':
        return 'Minus';
      case 'poor':
        return 'ArrowDown';
      default:
        return 'AlertCircle';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 mb-6">
      <div className="flex items-center space-x-2 mb-6">
        <Icon name="Target" size={24} className="text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Performance Indicators</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {indicators.map((indicator) => (
          <div key={indicator.id} className="border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-foreground">{indicator.name}</h4>
              <div className={`p-2 rounded-full ${getIndicatorColor(indicator.status)}`}>
                <Icon 
                  name={getStatusIcon(indicator.status)} 
                  size={16} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-foreground">
                  {indicator.value}
                </span>
                <span className="text-sm text-muted-foreground">
                  {indicator.unit}
                </span>
              </div>
              
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    indicator.status === 'excellent' ? 'bg-green-500' :
                    indicator.status === 'good' ? 'bg-blue-500' :
                    indicator.status === 'average'? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${indicator.progress}%` }}
                />
              </div>
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Target: {indicator.target}</span>
                <span className={`font-medium ${
                  indicator.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {indicator.change >= 0 ? '+' : ''}{indicator.change}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceIndicators;
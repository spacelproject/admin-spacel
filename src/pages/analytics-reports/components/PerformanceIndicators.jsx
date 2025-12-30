import React from 'react';
import Icon from '../../../components/AppIcon';

const PerformanceIndicators = ({ indicators }) => {
  const getIndicatorColor = (status) => {
    switch (status) {
      case 'excellent':
        return { icon: 'text-green-600', bg: 'bg-green-50', progress: 'bg-green-500' };
      case 'good':
        return { icon: 'text-blue-600', bg: 'bg-blue-50', progress: 'bg-blue-500' };
      case 'average':
        return { icon: 'text-yellow-600', bg: 'bg-yellow-50', progress: 'bg-yellow-500' };
      case 'poor':
        return { icon: 'text-red-600', bg: 'bg-red-50', progress: 'bg-red-500' };
      default:
        return { icon: 'text-gray-600', bg: 'bg-gray-50', progress: 'bg-gray-500' };
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
    <div className="mb-6">
      <div className="flex items-center space-x-2 mb-6">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Icon name="Target" size={20} className="text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Performance Indicators</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {indicators.map((indicator) => {
          const colors = getIndicatorColor(indicator.status);
          
          return (
            <div 
              key={indicator.id} 
              className="bg-white border border-gray-200 rounded-lg p-5 card-shadow hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-900">{indicator.name}</h4>
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <Icon 
                    name={getStatusIcon(indicator.status)} 
                    size={18} 
                    className={colors.icon}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold text-gray-900">
                    {indicator.value}
                  </span>
                  {indicator.unit && (
                    <span className="text-sm font-medium text-gray-500 ml-2">
                      {indicator.unit}
                    </span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${colors.progress}`}
                      style={{ width: `${Math.min(indicator.progress, 100)}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">
                      Target: <span className="text-gray-700">{indicator.target}</span>
                    </span>
                    <div className={`flex items-center space-x-1 font-semibold ${
                      indicator.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <Icon 
                        name={indicator.change >= 0 ? 'TrendingUp' : 'TrendingDown'} 
                        size={12}
                      />
                      <span>
                        {indicator.change >= 0 ? '+' : ''}{indicator.change}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PerformanceIndicators;
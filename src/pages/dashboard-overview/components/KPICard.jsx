import React from 'react';
import Icon from '../../../components/AppIcon';

const KPICard = ({ title, value, change, changeType, icon, color = 'primary' }) => {
  const getColorClasses = () => {
    switch (color) {
      case 'success':
        return 'bg-blue-50 text-blue-600';
      case 'warning':
        return 'bg-blue-50 text-blue-600';
      case 'error':
        return 'bg-blue-50 text-blue-600';
      default:
        return 'bg-blue-50 text-blue-600';
    }
  };

  const getChangeColor = () => {
    if (changeType === 'positive') return 'text-green-600';
    if (changeType === 'negative') return 'text-red-600';
    return 'text-gray-500';
  };

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-500 mb-2 tracking-wide uppercase">{title}</p>
          <p className="text-xl font-bold text-gray-900 mb-2 tracking-tight">{value}</p>
          {change && (
            <div className="flex items-center gap-1">
              <span className={`text-xs font-semibold ${getChangeColor()}`}>
                {change}
              </span>
            </div>
          )}
        </div>
        <div className={`icon-circle ${getColorClasses()}`}>
          <Icon name={icon} size={18} />
        </div>
      </div>
    </div>
  );
};

export default KPICard;